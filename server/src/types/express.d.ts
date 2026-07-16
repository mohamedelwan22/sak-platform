declare namespace Express {
  interface Request {
    requestId: string;
    user?: {
      userId: string;
      email: string;
      role: string;
      tokenVersion: number;
    };
  }
}
