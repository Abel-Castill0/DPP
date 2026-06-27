import { Sidebar } from "@/components/sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-60 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
