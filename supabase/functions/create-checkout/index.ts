import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  fullName: string;
  email: string;
  whatsapp: string;
  cpfCnpj: string;
  auditId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: CheckoutRequest = await req.json();
    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const whatsapp = body.whatsapp?.replace(/\D/g, "");
    const cpfCnpj = body.cpfCnpj?.replace(/\D/g, "");
    const auditId = body.auditId?.trim();

    if (!fullName || !email || !cpfCnpj || !auditId) {
      return new Response(
        JSON.stringify({ error: "Preencha nome, e-mail, WhatsApp e CPF/CNPJ." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY") ?? "";
    const asaasBaseUrl =
      Deno.env.get("ASAAS_ENV") === "sandbox"
        ? "https://sandbox.asaas.com/api/v3"
        : "https://api.asaas.com/v3";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseAuthClient = createClient(supabaseUrl, anonKey);

    // 1. Cria ou localiza o usuário no Supabase Auth e gera sessão instantânea
    const ephemeralPassword = `${crypto.randomUUID()}-Sec#2026`;
    let userId: string;

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, asaas_customer_id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: ephemeralPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
    } else {
      const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: ephemeralPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createErr || !createdUser.user) {
        throw new Error(`Falha ao criar conta: ${createErr?.message}`);
      }
      userId = createdUser.user.id;
    }

    // Autentica para retornar os tokens JWT ao navegador (habilita Realtime + RLS imediatamente)
    const { data: signInData, error: signInErr } =
      await supabaseAuthClient.auth.signInWithPassword({
        email,
        password: ephemeralPassword,
      });

    if (signInErr || !signInData.session) {
      throw new Error(`Falha ao iniciar sessão: ${signInErr?.message}`);
    }

    // 2. Cria ou recupera o cliente no Asaas
    let asaasCustomerId = existingProfile?.asaas_customer_id ?? null;

    if (!asaasCustomerId) {
      const customerRes = await fetch(`${asaasBaseUrl}/customers`, {
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

      const customerJson = await customerRes.json();
      if (!customerRes.ok || !customerJson.id) {
        const msg = customerJson?.errors?.[0]?.description || "Erro ao cadastrar cliente no Asaas.";
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

    // 3. Cria Assinatura Mensal via Pix (R$ 67,00/mês) com vencimento hoje
    const todayStr = new Date().toISOString().split("T")[0];
    const subscriptionRes = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasApiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "PIX",
        value: 67.0,
        nextDueDate: todayStr,
        cycle: "MONTHLY",
        description: "Assinatura Mensal - Auditoria de Marketplaces Pro",
        externalReference: `${userId}:${auditId}`,
      }),
    });

    const subscriptionJson = await subscriptionRes.json();
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
    const paymentsJson = await paymentsRes.json();
    const firstPaymentId = paymentsJson?.data?.[0]?.id;

    if (!firstPaymentId) {
      throw new Error("Cobrança Pix inicial não encontrada na assinatura.");
    }

    const pixRes = await fetch(`${asaasBaseUrl}/payments/${firstPaymentId}/pixQrCode`, {
      headers: { access_token: asaasApiKey },
    });
    const pixJson = await pixRes.json();

    if (!pixRes.ok || !pixJson.encodedImage) {
      throw new Error("Não foi possível gerar o QR Code Pix.");
    }

    return new Response(
      JSON.stringify({
        userId,
        session: signInData.session,
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
