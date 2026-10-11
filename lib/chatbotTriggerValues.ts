export function chatbotTriggerValues(message: {
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: { button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
}) {
  return [...new Set([
    message.text?.body, message.button?.payload, message.button?.text,
    message.interactive?.button_reply?.id, message.interactive?.button_reply?.title,
    message.interactive?.list_reply?.id, message.interactive?.list_reply?.title,
  ].filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).map(value => value.trim()))];
}
