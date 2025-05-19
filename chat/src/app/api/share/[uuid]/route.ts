import { NextResponse } from 'next/server';

// This is a mock database for development purposes
// In production, this would be replaced with a real database query
const mockConversations = new Map([
  [
    'abc123',
    {
      id: 'abc123',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: '1',
          role: 'user',
          content: "What's in H.R. 4671?",
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content:
            'H.R. 4671, also known as the "Save Act," is a bill that aims to reduce wasteful government spending. It includes provisions for:\n\n- Auditing federal programs for redundancy\n- Creating oversight mechanisms for large expenditures\n- Requiring cost-benefit analysis for new programs\n- Establishing penalties for agencies that don\'t comply with spending reduction goals\n\nThe bill was introduced as part of efforts to improve fiscal responsibility in government operations.',
          createdAt: new Date(
            Date.now() - 24 * 60 * 60 * 1000 + 30000,
          ).toISOString(),
        },
        {
          id: '3',
          role: 'user',
          content: 'How much has DOGE saved so far?',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          role: 'assistant',
          content:
            'DOGE (Department of Government Efficiency) has identified approximately $124 billion in potential savings across various government agencies since its inception. \n\nOf this amount, about $42 billion in actual spending reductions have been implemented through:\n\n- Elimination of 120+ redundant programs\n- Modernization of IT systems in 8 major departments\n- Renegotiation of government contracts\n- Improved grant oversight processes\n\nThese efforts are ongoing, with new efficiency initiatives being rolled out quarterly.',
          createdAt: new Date(
            Date.now() - 12 * 60 * 60 * 1000 + 45000,
          ).toISOString(),
        },
        {
          id: '3',
          role: 'user',
          content: 'How much has DOGE saved so far?',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          role: 'assistant',
          content:
            'DOGE (Department of Government Efficiency) has identified approximately $124 billion in potential savings across various government agencies since its inception. \n\nOf this amount, about $42 billion in actual spending reductions have been implemented through:\n\n- Elimination of 120+ redundant programs\n- Modernization of IT systems in 8 major departments\n- Renegotiation of government contracts\n- Improved grant oversight processes\n\nThese efforts are ongoing, with new efficiency initiatives being rolled out quarterly.',
          createdAt: new Date(
            Date.now() - 12 * 60 * 60 * 1000 + 45000,
          ).toISOString(),
        },
        {
          id: '3',
          role: 'user',
          content: 'How much has DOGE saved so far?',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          role: 'assistant',
          content:
            'DOGE (Department of Government Efficiency) has identified approximately $124 billion in potential savings across various government agencies since its inception. \n\nOf this amount, about $42 billion in actual spending reductions have been implemented through:\n\n- Elimination of 120+ redundant programs\n- Modernization of IT systems in 8 major departments\n- Renegotiation of government contracts\n- Improved grant oversight processes\n\nThese efforts are ongoing, with new efficiency initiatives being rolled out quarterly.',
          createdAt: new Date(
            Date.now() - 12 * 60 * 60 * 1000 + 45000,
          ).toISOString(),
        },
        {
          id: '3',
          role: 'user',
          content: 'How much has DOGE saved so far?',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          role: 'assistant',
          content:
            'DOGE (Department of Government Efficiency) has identified approximately $124 billion in potential savings across various government agencies since its inception. \n\nOf this amount, about $42 billion in actual spending reductions have been implemented through:\n\n- Elimination of 120+ redundant programs\n- Modernization of IT systems in 8 major departments\n- Renegotiation of government contracts\n- Improved grant oversight processes\n\nThese efforts are ongoing, with new efficiency initiatives being rolled out quarterly.',
          createdAt: new Date(
            Date.now() - 12 * 60 * 60 * 1000 + 45000,
          ).toISOString(),
        },
      ],
    },
  ],
  [
    'def456',
    {
      id: 'def456',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'Give me 3 recent bills',
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content:
            'Here are 3 recent bills:\n\n1. **H.R. 7024: CHIPS and Science Act of 2022**\n   - Status: Enacted\n   - Purpose: Aims to strengthen semiconductor manufacturing, R&D, and supply chain security in the United States\n   - Includes $52 billion in subsidies for semiconductor production\n\n2. **S. 2938: Bipartisan Safer Communities Act**\n   - Status: Enacted\n   - Purpose: First major federal gun safety legislation in decades\n   - Enhances background checks for buyers under 21 and provides funding for mental health services\n\n3. **H.R. 5376: Inflation Reduction Act of 2022**\n   - Status: Enacted\n   - Purpose: Climate change, healthcare, and tax provisions\n   - Includes $369 billion for energy security and climate change initiatives',
          createdAt: new Date(
            Date.now() - 3 * 60 * 60 * 1000 + 25000,
          ).toISOString(),
        },
      ],
    },
  ],
]);

export async function GET(
  request: Request,
  { params }: { params: { uuid: string } },
) {
  // Ensure params is fully resolved before accessing properties
  const uuid = params.uuid;

  // Add artificial delay to simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if the conversation exists
  if (!mockConversations.has(uuid)) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 },
    );
  }

  // Return the conversation
  return NextResponse.json(mockConversations.get(uuid));
}

// For development purposes only - in production you'd want proper auth checks
export async function HEAD(
  request: Request,
  { params }: { params: { uuid: string } },
) {
  // Ensure params is fully resolved before accessing properties
  const uuid = params.uuid;

  if (!mockConversations.has(uuid)) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { status: 200 });
}
