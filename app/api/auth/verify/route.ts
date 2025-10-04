import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Decode session token (in production, verify JWT properly)
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString();
      const [username, timestamp] = decoded.split(':');
      
      // Check if session is still valid (24 hours)
      const sessionTime = parseInt(timestamp);
      const now = Date.now();
      const isValid = (now - sessionTime) < 24 * 60 * 60 * 1000;
      
      if (isValid && username) {
        return NextResponse.json(
          { 
            authenticated: true, 
            user: { username } 
          },
          { status: 200 }
        );
      }
    } catch (decodeError) {
      console.error('Session decode error:', decodeError);
    }

    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}