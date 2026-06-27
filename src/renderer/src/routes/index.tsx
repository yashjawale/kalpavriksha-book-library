import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import PageTitle from '@renderer/components/ui/page-title'
import { Spinner } from '@renderer/components/ui/spinner'
import { format } from 'date-fns'
import { DashboardCard } from '@renderer/components/DashboardCard'
import { Button } from '@renderer/components/ui/button'
import { ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Dashboard
})

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => await window.api.dashboard.getStats()
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-16" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <PageTitle title="Dashboard" />

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-12">
        <DashboardCard value={(stats?.totalBooks || 0).toString()} label="Books" />
        <DashboardCard value={(stats?.totalUsers || 0).toString()} label="Users" />
        <DashboardCard value={(stats?.activeRentals || 0).toString()} label="Active Rentals" />
        <DashboardCard value={(stats?.rentalsToday || 0).toString()} label="Rented Today" />
        <DashboardCard
          value={`${stats?.dueTodayRemaining || 0}/${stats?.dueTodayTotal || 0}`}
          label="Today's Returns"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Upcoming returns</h2>
            <Button asChild>
              <Link to="/returns">
                View all <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-10 px-4 text-left font-medium">Name</th>
                  <th className="h-10 px-4 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {!stats?.upcomingReturns?.length ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-muted-foreground">
                      No upcoming returns.
                    </td>
                  </tr>
                ) : (
                  stats?.upcomingReturns?.map(
                    (loan: {
                      id: number
                      borrower: { name: string | null; email: string }
                      dueDate: Date | null
                    }) => (
                      <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-4 align-middle">
                          {loan.borrower.name || loan.borrower.email}
                        </td>
                        <td className="p-4 align-middle">
                          {loan.dueDate
                            ? format(new Date(loan.dueDate), 'MMM d, yyyy')
                            : 'No due date'}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recent rentals</h2>
            <Button asChild>
              <Link to="/rentals">
                View all <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-10 px-4 text-left font-medium">Name</th>
                  <th className="h-10 px-4 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {!stats?.recentRentals?.length ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-muted-foreground">
                      No recent rentals.
                    </td>
                  </tr>
                ) : (
                  stats?.recentRentals?.map(
                    (loan: {
                      id: number
                      borrower: { name: string | null; email: string }
                      borrowedAt: Date
                    }) => (
                      <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-4 align-middle">
                          {loan.borrower.name || loan.borrower.email}
                        </td>
                        <td className="p-4 align-middle">
                          {format(new Date(loan.borrowedAt), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
