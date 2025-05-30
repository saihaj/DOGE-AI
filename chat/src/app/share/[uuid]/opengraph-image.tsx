import { createTrpcServerClient } from '@/lib/trpc/server';
import { UIMessage } from 'ai';
import removeMarkdown from 'markdown-to-text';
import { ImageResponse } from 'next/og';

export const alt = 'DOGEai Chat';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

async function loadGoogleFont(font: string, weight: string | number = '400') {
  // Encode font name (e.g., replace spaces with "+")
  const fontEncoded = font.replace(/\s+/g, '+');
  // Include weight in the Google Fonts URL
  const url = `https://fonts.googleapis.com/css2?family=${fontEncoded}:wght@${weight}`;
  const css = await (await fetch(url)).text();

  // Match all @font-face rules
  const fontFaceRegex = /@font-face\s*{([^}]+)}/g;
  const fontFaces = css.matchAll(fontFaceRegex);

  for (const face of fontFaces) {
    const declarations = face[1];
    // Check if the font-weight matches
    const weightMatch = declarations.match(/font-weight:\s*(\d+)/);
    if (weightMatch && weightMatch[1] === weight.toString()) {
      // Extract the src URL
      const srcMatch = declarations.match(
        /src: url\((.+)\) format\('(woff2|opentype|truetype)'\)/,
      );
      if (srcMatch) {
        const fontUrl = srcMatch[1];
        const response = await fetch(fontUrl);
        if (response.status === 200) {
          return await response.arrayBuffer();
        }
      }
    }
  }

  throw new Error(`Failed to load font data for ${font} (weight: ${weight})`);
}

export default async function Image({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const trpc = createTrpcServerClient();
  const { chat, messages } = await trpc.getPublicChatMessages.query({
    id: uuid,
  });

  const firstMessage = messages.at(0) as UIMessage | undefined;
  const firstFewReplies = removeMarkdown(
    messages
      .filter(m => m.role === 'assistant')
      .flatMap(m => m.parts)
      .filter(m => m.type === 'text')
      .map(m => m.text)
      .slice(0, 3)
      .join('\n\n'),
  )
    .replace(/\n/g, ' ')
    .trim()
    .slice(0, 800);

  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <img
          src="https://dogeai.info/logo.jpg"
          alt="DOGEai Logo"
          style={{
            width: 110,
            height: 110,
            borderRadius: 9999,
            marginBottom: '10px',
          }}
        />
        {firstMessage ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: '1180px',
              width: '100%',
            }}
          >
            <h1
              style={{
                fontWeight: 700,
                fontSize: '78px',
                textAlign: 'center',
                marginBottom: '30px',
                lineHeight: '1.1',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                maxWidth: '100%',
              }}
            >
              {firstMessage.parts
                .map(a => {
                  if (a.type === 'text') {
                    return a.text;
                  }
                })
                .join('') || firstMessage.content}
            </h1>

            {/* Container with relative positioning for the overlay effect */}
            <div
              style={{
                display: 'flex',
                position: 'relative',
                width: '100%',
                maxHeight: '200px',
                overflow: 'hidden',
                marginBottom: '20px',
              }}
            >
              <p
                style={{
                  fontSize: '26px',
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                {firstFewReplies}
              </p>

              {/* Gradient overlay that creates the shadow effect */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '120px',
                  background:
                    'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,1) 100%)',
                  pointerEvents: 'none',
                }}
              />

              {/* CTA Button positioned over the gradient */}
              <div
                style={{
                  display: 'flex',
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              >
                <button
                  style={{
                    background: 'black',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '58px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  }}
                >
                  Continue Reading
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              {chat?.title || 'Shared Conversation - DOGEai Chat'}
            </h1>
            <button
              style={{
                background: 'black',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '58px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              }}
            >
              Continue Reading
            </button>
          </div>
        )}
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Geist',
          data: await loadGoogleFont('Geist', 400),
          style: 'normal',
          weight: 400,
        },
        {
          name: 'Geist',
          data: await loadGoogleFont('Geist', 700),
          style: 'normal',
          weight: 700,
        },
      ],
    },
  );
}
