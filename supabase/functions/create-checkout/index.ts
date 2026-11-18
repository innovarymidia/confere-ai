import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  fullName: string;
  email: string;
  password?: string;
  whatsapp: string;
  cpfCnpj: string;
  auditId?: string;
  planId?: "pro" | "escala" | string;
  billing?: "monthly" | "yearly";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: CheckoutRequest = await req.json();
    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const whatsapp = body.whatsapp?.replace(/\D/g, "");
    const cpfCnpj = body.cpfCnpj?.replace(/\D/g, "");
    const auditId = body.auditId?.trim() || "direct";
    const planId = body.planId === "escala" ? "escala" : "pro";
    const billing = body.billing === "yearly" ? "yearly" : "monthly";

    if (!fullName || !email || !cpfCnpj || !whatsapp) {
      return new Response(
        JSON.stringify({ error: "Preencha nome, e-mail, WhatsApp e CPF/CNPJ." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (fullName.length > 150 || email.length > 150) {
      return new Response(
        JSON.stringify({ error: "Nome ou e-mail excede o tamanho máximo permitido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validação estrita de formato de e-mail (RFC 5322 simplificada)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Endereço de e-mail com formato inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validação de CPF (11 dígitos) ou CNPJ (14 dígitos)
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      return new Response(
        JSON.stringify({ error: "CPF deve conter 11 dígitos ou CNPJ 14 dígitos numéricos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validação de WhatsApp / Celular brasileiro (DDD + 8 ou 9 dígitos = 10 a 11 dígitos)
    if (whatsapp.length < 10 || whatsapp.length > 11) {
      return new Response(
        JSON.stringify({ error: "WhatsApp deve conter DDD e número válido (10 ou 11 dígitos)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    let asaasApiKey = (Deno.env.get("ASAAS_API_KEY") ?? "").trim();
    const asaasEnv = (Deno.env.get("ASAAS_ENV") ?? "").trim().toLowerCase();

    // Se o valor contiver o comando de terminal colado acidentalmente, extrai apenas o token $aact_
    if (asaasApiKey.includes("$aact_")) {
      const match = asaasApiKey.match(/\$aact_[A-Za-z0-9+/=_-]+/);
      if (match) {
        asaasApiKey = match[0];
      }
    }

    // Determina a URL base oficial do Asaas (Producao ou Sandbox)
    const asaasBaseUrl =
      asaasEnv === "production" || asaasEnv === "prod"
        ? "https://api.asaas.com/v3"
        : "https://sandbox.asaas.com/api/v3";

    if (!asaasApiKey) {
      return new Response(
        JSON.stringify({
          error: "Chave secreta ASAAS_API_KEY não encontrada nas variáveis (Secrets) do Supabase.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!asaasApiKey.startsWith("$aact_")) {
      return new Response(
        JSON.stringify({
          error: "A chave secreta ASAAS_API_KEY configurada no Supabase é inválida. Certifique-se de configurar a chave oficial começando com '$aact_'.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseAuthClient = createClient(supabaseUrl, anonKey);

    // 1. Cria ou localiza o usuário no Supabase Auth
    let userId: string;
    let userSession: unknown = null;

    // Busca conta existente por e-mail ou CPF/CNPJ
    let existingProfile: {
      id: string;
      email: string;
      cpf_cnpj: string | null;
      asaas_customer_id: string | null;
    } | null = null;

    const { data: profileByEmail } = await supabaseAdmin
      .from("profiles")
      .select("id, email, cpf_cnpj, asaas_customer_id")
      .eq("email", email)
      .maybeSingle();

    if (profileByEmail) {
      existingProfile = profileByEmail;
    } else if (cpfCnpj) {
      const { data: profileByCpf } = await supabaseAdmin
        .from("profiles")
        .select("id, email, cpf_cnpj, asaas_customer_id")
        .eq("cpf_cnpj", cpfCnpj)
        .maybeSingle();

      if (profileByCpf) {
        existingProfile = profileByCpf;
      }
    }

    if (existingProfile?.id) {
      // Verifica se a requisição atual já possui sessão autenticada deste próprio usuário
      let isAuthorized = false;
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        if (userData?.user?.id === existingProfile.id) {
          userSession = { access_token: token };
          isAuthorized = true;
          userId = existingProfile.id;
        }
      }

      // Se não estiver logado na sessão atual:
      if (!isAuthorized) {
        // Se forneceu senha, tenta autenticar sem jamais sobrescrever a senha existente
        if (password) {
          const { data: signInData, error: signInErr } = await supabaseAuthClient.auth.signInWithPassword({
            email: existingProfile.email,
            password,
          });

          if (!signInErr && signInData?.session) {
            userSession = signInData.session;
            userId = existingProfile.id;
            isAuthorized = true;
          }
        }

        // Se não conseguiu autenticar com a senha existente:
        if (!isAuthorized) {
          return new Response(
            JSON.stringify({
              error:
                "Este e-mail ou CPF já possui cadastro no ConfereAI. Por segurança, sua senha não foi alterada. Faça login com sua senha atual ou solicite a recuperação de acesso.",
              code: "ACCOUNT_EXISTS",
              accountEmail: existingProfile.email,
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      userId = existingProfile.id;

      // Atualiza telefone e CPF caso não estivessem preenchidos anteriormente
      await supabaseAdmin
        .from("profiles")
        .update({
          cpf_cnpj: existingProfile.cpf_cnpj || cpfCnpj || undefined,
          whatsapp: whatsapp || undefined,
          full_name: fullName || undefined,
        })
        .eq("id", userId);
    } else {
      const passwordToUse = password && password.length >= 6 ? password : `${crypto.randomUUID()}-Sec#2026`;
      const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: passwordToUse,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createErr || !createdUser.user) {
        throw new Error(`Falha ao criar conta: ${createErr?.message}`);
      }
      userId = createdUser.user.id;

      // Atualiza dados cadastrais no profile recém-criado
      await supabaseAdmin
        .from("profiles")
        .update({
          cpf_cnpj: cpfCnpj || undefined,
          whatsapp: whatsapp || undefined,
          full_name: fullName || undefined,
        })
        .eq("id", userId);

      // Autentica com a senha cadastrada para gerar a sessão de login imediata
      const { data: signInData } = await supabaseAuthClient.auth.signInWithPassword({
        email,
        password: passwordToUse,
      });
      userSession = signInData?.session ?? null;
    }

    // Vincula imediatamente a auditoria ao usuário criado ou identificado
    if (auditId && auditId !== "direct") {
      await supabaseAdmin
        .from("audits")
        .update({ user_id: userId })
        .eq("id", auditId)
        .is("user_id", null);
    }

    // 2. Cria ou recupera o cliente no Asaas
    let asaasCustomerId = existingProfile?.asaas_customer_id ?? null;

    if (!asaasCustomerId) {
      let customerRes = await fetch(`${asaasBaseUrl}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: asaasApiKey,
        },
        body: JSON.stringify({
          name: fullName,
          email,
          cpfCnpj,
          mobilePhone: whatsapp,
          externalReference: userId,
          notificationDisabled: false,
        }),
      });

      let customerText = await customerRes.text();
      let customerJson: Record<string, any> = {};
      try {
        customerJson = JSON.parse(customerText);
      } catch {
        // Ignora erro de parse inicial
      }

      if (!customerRes.ok || !customerJson.id) {
        const msg =
          customerJson?.errors?.[0]?.description ||
          `Erro ao cadastrar cliente no Asaas (${asaasBaseUrl}): ${customerText.slice(0, 100)}`;
        throw new Error(msg);
      }
      asaasCustomerId = customerJson.id;
    }

    // Salva dados cadastrais no profile
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        cpf_cnpj: cpfCnpj,
        whatsapp,
        asaas_customer_id: asaasCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // 3. Cria Assinatura com plano e ciclo escolhidos pelo lojista
    const todayStr = new Date().toISOString().split("T")[0];
    let subscriptionValue = 67.0;
    let subscriptionCycle = "MONTHLY";
    let subscriptionDescription = "ConfereAI Pro Seller Mensal: Auditoria de Vendas";

    if (planId === "escala") {
      if (billing === "yearly") {
        subscriptionValue = 1416.0;
        subscriptionCycle = "YEARLY";
        subscriptionDescription = "ConfereAI Operacao Escala Anual: 20% OFF";
      } else {
        subscriptionValue = 147.0;
        subscriptionCycle = "MONTHLY";
        subscriptionDescription = "ConfereAI Operacao Escala Mensal: Ate 5 Lojas";
      }
    } else {
      if (billing === "yearly") {
        subscriptionValue = 648.0;
        subscriptionCycle = "YEARLY";
        subscriptionDescription = "ConfereAI Pro Seller Anual: 20% OFF";
      } else {
        subscriptionValue = 67.0;
        subscriptionCycle = "MONTHLY";
        subscriptionDescription = "ConfereAI Pro Seller Mensal: Auditoria de Vendas";
      }
    }

    const subscriptionRes = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasApiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "PIX",
        value: subscriptionValue,
        nextDueDate: todayStr,
        cycle: subscriptionCycle,
        description: subscriptionDescription,
        externalReference: `${userId}:${auditId}:${billing}`,
      }),
    });

    const subscriptionText = await subscriptionRes.text();
    let subscriptionJson: Record<string, any> = {};
    try {
      subscriptionJson = JSON.parse(subscriptionText);
    } catch {
      throw new Error(`Resposta inesperada do Asaas ao criar assinatura (HTTP ${subscriptionRes.status}): ${subscriptionText.slice(0, 120)}`);
    }

    if (!subscriptionRes.ok || !subscriptionJson.id) {
      const msg = subscriptionJson?.errors?.[0]?.description || "Erro ao criar assinatura no Asaas.";
      throw new Error(msg);
    }

    await supabaseAdmin
      .from("profiles")
      .update({ asaas_subscription_id: subscriptionJson.id })
      .eq("id", userId);

    // 4. Busca a primeira cobrança gerada pela assinatura para extrair o QR Code Pix
    const paymentsRes = await fetch(
      `${asaasBaseUrl}/subscriptions/${subscriptionJson.id}/payments`,
      {
        headers: { access_token: asaasApiKey },
      }
    );
    const paymentsText = await paymentsRes.text();
    let paymentsJson: Record<string, any> = {};
    try {
      paymentsJson = JSON.parse(paymentsText);
    } catch {
      throw new Error(`Resposta inesperada do Asaas ao buscar cobranças (HTTP ${paymentsRes.status})`);
    }
    const firstPaymentId = paymentsJson?.data?.[0]?.id;

    if (!firstPaymentId) {
      throw new Error("Cobrança Pix inicial não encontrada na assinatura.");
    }

    const pixRes = await fetch(`${asaasBaseUrl}/payments/${firstPaymentId}/pixQrCode`, {
      headers: { access_token: asaasApiKey },
    });
    const pixText = await pixRes.text();
    let pixJson: Record<string, any> = {};
    try {
      pixJson = JSON.parse(pixText);
    } catch {
      throw new Error(`Resposta inesperada do Asaas ao gerar QR Code Pix (HTTP ${pixRes.status})`);
    }

    if (!pixRes.ok || !pixJson.encodedImage) {
      const msg =
        pixJson?.errors?.[0]?.description ||
        `Não foi possível gerar o QR Code Pix (HTTP ${pixRes.status}): ${pixText.slice(0, 150)}`;
      throw new Error(msg);
    }

    return new Response(
      JSON.stringify({
        userId,
        session: userSession,
        qrCodeBase64: pixJson.encodedImage,
        copyPaste: pixJson.payload,
        expirationDate: pixJson.expirationDate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro create-checkout:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Erro interno ao gerar Pix.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
