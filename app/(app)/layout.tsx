import { Sidebar } from "@/components/sidebar"
import { getSession } from "@/lib/auth"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  const user = session ? { name: session.name, role: session.role } : null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0 ml-60 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
