#!/usr/bin/env node
/**
 * Configure Retell agent with post-call analysis fields
 */
require('dotenv').config({ path: '.env.local' });

async function run() {
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;
  
  const res = await fetch(`https://api.retellai.com/update-agent/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      post_call_analysis_data: [
        {
          name: 'call_summary',
          description: 'A brief summary of the call: main topics discussed, questions asked, and outcome.',
          type: 'string',
        },
        {
          name: 'user_sentiment',
          description: 'The overall sentiment of the lead during the call.',
          type: 'enum',
          choices: ['Positive', 'Negative', 'Neutral'],
        },
        {
          name: 'questions_asked',
          description: 'All questions the lead asked during the call, separated by semicolons.',
          type: 'string',
        },
        {
          name: 'interested',
          description: 'Whether the lead expressed interest in joining Swar Yoga workshops.',
          type: 'enum',
          choices: ['Yes', 'No', 'Maybe'],
        },
      ],
    }),
  });
  
  const data = await res.json();
  console.log('Agent:', data.agent_name);
  console.log('Webhook:', data.webhook_url || 'NOT SET');
  console.log('Post-call analysis fields:', (data.post_call_analysis_data || []).length);
  console.log('Fields:', (data.post_call_analysis_data || []).map(f => f.name).join(', '));
}

run().catch(e => { console.error(e.message); process.exit(1); });
