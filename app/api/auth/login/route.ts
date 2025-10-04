import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Get credentials from environment
    const validUsername = process.env.LOGIN_USERNAME;
    const validPassword = process.env.LOGIN_PASSWORD;

    if (!validUsername || !validPassword) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Validate credentials
    if (username === validUsername && password === validPassword) {
      // Create a simple session token (in production, use proper JWT)
      const sessionToken = Buffer.from(`${username}:${Date.now()}`).toString('base64');
      
      const response = NextResponse.json(
        { 
          success: true, 
          message: 'Login successful',
          user: { username }
        },
        { status: 200 }
      );

      // Set httpOnly cookie for session
      response.cookies.set('session', sessionToken, {
        httpOnly: true,
        secure: false, // Allow HTTP in development
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/', // Always use root path to ensure cookie is accessible from all routes
        domain: undefined // Allow all domains
      });

      return response;
    } else {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}