import { type NextRequest, NextResponse } from "next/server"

// Simple JWT-like token generation (for demo purposes)
// In production, use a proper JWT library like 'jose' or 'jsonwebtoken'
function generateToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payloadStr = btoa(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }))
  const signature = btoa(JSON.stringify({ signed: true }))
  return `${header}.${payloadStr}.${signature}`
}

// Demo users database (replace with real database in production)
const users = [
  { id: 1, email: "user@example.com", username: "user", password: "password123", name: "John Doe" },
  { id: 2, email: "admin@example.com", username: "admin", password: "admin123", name: "Admin User" },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailOrUsername, password } = body

    // Find user by email or username
    const user = users.find(
      (u) =>
        (u.email.toLowerCase() === emailOrUsername.toLowerCase() ||
          u.username.toLowerCase() === emailOrUsername.toLowerCase()) &&
        u.password === password,
    )

    if (!user) {
      return NextResponse.json({ message: "Invalid email/username or password" }, { status: 401 })
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
      },
    })
  } catch (error) {
    return NextResponse.json({ message: "An error occurred during authentication" }, { status: 500 })
  }
}
