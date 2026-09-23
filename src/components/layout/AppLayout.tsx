import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'

export function AppLayout() {
  return (
    <div className="flex h-full min-h-screen bg-[#F5F6FA]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-5 py-5 lg:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
