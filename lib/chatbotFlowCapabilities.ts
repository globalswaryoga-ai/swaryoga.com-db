export const BUNNY_META_NODE_TYPES = ['message', 'question', 'buttons', 'template', 'delay', 'end', 'wait_reply'];
export function unsupportedChatbotNodes(nodes: Array<{ type?: string }> = []) {
  return [...new Set(nodes.map(node => String(node.type || '')).filter(type => !BUNNY_META_NODE_TYPES.includes(type)))];
}
