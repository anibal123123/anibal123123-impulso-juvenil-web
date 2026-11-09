import { LoginScreen } from '@/components/login-screen'
import { emailIsConfigured } from '@/lib/email'

export default function Page() {
  return <LoginScreen emailEnabled={emailIsConfigured} />
}
