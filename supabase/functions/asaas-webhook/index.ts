import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validação de segurança: verifica o token configurado no painel do Asaas
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const receivedToken = req.headers.get("asaas-access-token");

    if (!expectedToken || receivedToken !== expectedToken) {
      console.error("Tentativa de acesso não autorizado no webhook Asaas.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const event = payload?.event as string;
    const payment = payload?.payment;

    if (!event || !payment) {
      return new Response(JSON.stringify({ received: true, ignored: "Invalid payload" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Inicializa Supabase com Service Role Key (ignora RLS para atualizar status Pro)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const customerId = payment.customer as string | undefined;
    const subscriptionId = payment.subscription as string | undefined;
    const externalRef = payment.externalReference as string | undefined;

    // Extrai userId e auditId do externalReference ("userId:auditId")
    let userIdFromRef: string | null = null;
    let auditIdFromRef: string | null = null;

    if (externalRef && externalRef.includes(":")) {
      const [uId, aId] = externalRef.split(":");
      userIdFromRef = uId || null;
      auditIdFromRef = aId || null;
    } else if (externalRef) {
      userIdFromRef = externalRef;
    }

    // 3. Eventos de Pagamento Confirmado / Recebido (Pix ou Cartão)
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      // Concede 32 dias de acesso (30 dias + 2 dias de margem para renovação)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 32);

      // Localiza o profile pelo userId (externalReference) ou pelo asaas_customer_id
      let targetUserId = userIdFromRef;

      if (!targetUserId && customerId) {
        const { data: profileByCustomer } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("asaas_customer_id", customerId)
          .maybeSingle();

        targetUserId = profileByCustomer?.id ?? null;
      }

      if (!targetUserId) {
        console.error("Usuário não encontrado para o pagamento:", payment.id);
        return new Response(JSON.stringify({ received: true, warning: "User not found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Atualiza o perfil para PRO (dispara o Supabase Realtime no front-end)
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          is_pro: true,
          subscription_status: "active",
          asaas_customer_id: customerId ?? undefined,
          asaas_subscription_id: subscriptionId ?? undefined,
          pro_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUserId);

      if (updateError) {
        throw updateError;
      }

      // Se veio o audit_id da tela atual, já vincula a auditoria ao dono
      if (auditIdFromRef) {
        await supabaseAdmin
          .from("audits")
          .update({ user_id: targetUserId })
          .eq("id", auditIdFromRef)
          .is("user_id", null);
      }

      console.log(`Acesso PRO liberado com sucesso para o usuário ${targetUserId}`);
    }

    // 4. Eventos de Inadimplência ou Cancelamento
    if (
      event === "PAYMENT_OVERDUE" ||
      event === "SUBSCRIPTION_INACTIVATED" ||
      event === "SUBSCRIPTION_DELETED"
    ) {
      const statusMap: Record<string, string> = {
        PAYMENT_OVERDUE: "overdue",
        SUBSCRIPTION_INACTIVATED: "canceled",
        SUBSCRIPTION_DELETED: "canceled",
      };

      if (customerId) {
        await supabaseAdmin
          .from("profiles")
          .update({
            is_pro: false,
            subscription_status: statusMap[event] || "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("asaas_customer_id", customerId);
      }
    }

    // Sempre retorna 200 OK para o Asaas não reenviar o mesmo evento em loop
    return new Response(JSON.stringify({ received: true, event }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro interno no webhook Asaas:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
