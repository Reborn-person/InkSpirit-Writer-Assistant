import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.delete('token');
  if (process.env.NODE_ENV === 'production') {
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
      domain: '.inkspirit.top',
    });
  }
  return response;
}
