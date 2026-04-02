/**
 * Telegram notifications to admin group topics
 */

const BOT_TOKEN = '8357258923:AAEZMeF4D5EO6vSyg5_XcyaXNsyEYZ9aGxk';
const CHAT_ID = '-1003570685574';

const TOPICS = {
  REGISTRATION: 7231,
  AGENT_CREATED: 7232,
  PAYMENT: 7233,
  SUPPORT: 7234,
} as const;

async function sendToTopic(topicId: number, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        message_thread_id: topicId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error('[TG Notify] Failed:', err);
  }
}

export function notifyRegistration(email: string, name?: string | null): void {
  const lines = [
    `<b>Новая регистрация</b>`,
    `📧 ${email}`,
  ];
  if (name) lines.push(`👤 ${name}`);
  lines.push(`🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`);
  sendToTopic(TOPICS.REGISTRATION, lines.join('\n'));
}

export function notifyAgentCreated(agentName: string, userEmail: string, agentId: string): void {
  const lines = [
    `<b>Новый агент</b>`,
    `🤖 ${agentName}`,
    `👤 ${userEmail}`,
    `🆔 <code>${agentId}</code>`,
    `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
  ];
  sendToTopic(TOPICS.AGENT_CREATED, lines.join('\n'));
}

export function notifyPayment(userEmail: string, amount: number, currency: string, puAmount?: number): void {
  const lines = [
    `<b>Пополнение</b>`,
    `👤 ${userEmail}`,
    `💵 ${amount} ${currency}`,
  ];
  if (puAmount) lines.push(`🔋 +${puAmount} PU`);
  lines.push(`🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`);
  sendToTopic(TOPICS.PAYMENT, lines.join('\n'));
}

export function notifySupportTicket(userEmail: string, subject: string, message?: string): void {
  const lines = [
    `<b>Новый запрос в поддержку</b>`,
    `👤 ${userEmail}`,
    `📋 ${subject}`,
  ];
  if (message) lines.push(`💬 ${message.slice(0, 200)}${message.length > 200 ? '...' : ''}`);
  lines.push(`🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`);
  sendToTopic(TOPICS.SUPPORT, lines.join('\n'));
}
