import { getIndicators } from '@/lib/data'
import { authErrorResponse, getMember } from '@/lib/session'

export async function GET() {
  try {
    const member = await getMember()
    const data = await getIndicators(member)
    return Response.json({ ...data, servidoEn: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return authErrorResponse(error)
  }
}
