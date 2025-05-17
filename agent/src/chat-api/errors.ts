import { chatLogger, WithLogger } from '../logger';

export type ChatErrorType =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit'
  | 'offline';

export type ChatSurface =
  | 'chat'
  | 'auth'
  | 'api'
  | 'stream'
  | 'database'
  | 'history'
  | 'vote';

export type ChatErrorCode = `${ChatErrorType}:${ChatSurface}`;

export type ChatErrorVisibility = 'response' | 'log' | 'none';

export const visibilityBySurface: Record<ChatSurface, ChatErrorVisibility> = {
  database: 'log',
  chat: 'response',
  auth: 'response',
  stream: 'response',
  api: 'response',
  history: 'response',
  vote: 'response',
};

export class ChatSDKError extends Error {
  public type: ChatErrorType;
  public surface: ChatSurface;
  public statusCode: number;
  private log: WithLogger;

  constructor(errorCode: ChatErrorCode, cause?: string, requestId?: string) {
    super();

    const [type, surface] = errorCode.split(':');

    this.type = type as ChatErrorType;
    this.cause = cause;
    this.surface = surface as ChatSurface;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
    this.log = chatLogger.child({
      module: 'ChatSDKError',
      requestId,
    });
  }

  public toResponse() {
    const code: ChatErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    this.log.error(
      {
        code,
        message,
        cause,
      },
      `ChatSDKError: ${code}`,
    );

    if (visibility === 'log') {
      return Response.json(
        { code: '', message: 'Something went wrong. Please try again later.' },
        { status: statusCode },
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ChatErrorCode): string {
  if (errorCode.includes('database')) {
    return 'An error occurred while executing a database query.';
  }

  switch (errorCode) {
    case 'bad_request:api':
      return "The request couldn't be processed. Please check your input and try again.";

    case 'unauthorized:auth':
      return 'You need to sign in before continuing.';
    case 'forbidden:auth':
      return 'Your account does not have access to this feature.';

    case 'rate_limit:chat':
      return 'You have exceeded your maximum number of messages for the day. Please try again later.';
    case 'not_found:chat':
      return 'The requested chat was not found. Please check the chat ID and try again.';
    case 'forbidden:chat':
      return 'This chat belongs to another user. Please check the chat ID and try again.';
    case 'unauthorized:chat':
      return 'You need to sign in to view this chat. Please sign in and try again.';
    case 'offline:chat':
      return "We're having trouble sending your message. Please check your internet connection and try again.";

    default:
      return 'Something went wrong. Please try again later.';
  }
}

function getStatusCodeByType(type: ChatErrorType) {
  switch (type) {
    case 'bad_request':
      return 400;
    case 'unauthorized':
      return 401;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'rate_limit':
      return 429;
    case 'offline':
      return 503;
    default:
      return 500;
  }
}
