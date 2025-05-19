import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { PRIVY_COOKIE_NAME } from '@/lib/const';

// This would be replaced with a database in production
// For demonstration, we'll use in-memory storage
const sharedConversations = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (in production, you'd add proper authentication)
    const privyToken = request.headers.get(PRIVY_COOKIE_NAME);
    if (!privyToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { messages } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Valid messages are required' },
        { status: 400 }
      );
    }

    // Generate a unique ID for this shared conversation
    const id = randomUUID();

    // Store the conversation (in production, this would go to a database)
    const shareData = {
      id,
      createdAt: new Date().toISOString(),
      messages: messages.map((message: any) => ({
        ...message,
        createdAt: message.createdAt || new Date().toISOString(),
      })),
      // We might want to store the user ID here in a real implementation
      // userId: getUserIdFromToken(privyToken),
    };

    // Save to our "database"
    sharedConversations.set(id, shareData);

    // Set an expiration (in a real app, this would be handled by the database)
    setTimeout(() => {
      sharedConversations.delete(id);
    }, 1000 * 60 * 60 * 24 * 7); // Expire after 7 days

    // Return the ID to the client
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Error creating share:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

// GET endpoint to list shares for development purposes only
// In production, this would be protected and paginated
export async function GET(request: NextRequest) {
  // This is just for demonstration - in production you'd want proper authentication
  const privyToken = request.headers.get(PRIVY_COOKIE_NAME);
  if (!privyToken) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Return only IDs, not full conversation data
  const shares = Array.from(sharedConversations.keys()).map(id => ({ id }));
  
  return NextResponse.json({ shares }, { status: 200 });
}