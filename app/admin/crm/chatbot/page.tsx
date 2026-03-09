import { redirect } from 'next/navigation';

/**
 * Legacy chatbot page — redirects to the new modular chatbots page.
 * Kept as a server component for instant redirect without client JS.
 */
export default function LegacyChatbotPage() {
  redirect('/admin/crm/chatbots');
}
