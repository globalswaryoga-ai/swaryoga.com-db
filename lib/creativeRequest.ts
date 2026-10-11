export function requestsImage(prompt: string): boolean {
  return /\b(?:create|generate|make|design|draw)\b[\s\S]{0,80}\b(?:image|images|photo|poster|banner|graphic|visual|ad|advertisement)\b/i.test(prompt)
    || /\b(?:thumbnail|picture|background)\b/i.test(prompt)
    || /\b(?:image|photo|poster)\s+banao\b/i.test(prompt);
}

export function boundedCreativeHistory(messages: unknown): { role: 'user' | 'ai'; content: string }[] {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-8).flatMap(message => {
    if (!message || typeof message.content !== 'string') return [];
    return [{
      role: message.role === 'user' ? 'user' as const : 'ai' as const,
      content: message.content.replace(/data:image\/[^\s]+/g, '[Image omitted]').slice(0, 1500),
    }];
  });
}
