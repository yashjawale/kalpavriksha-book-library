import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import PageTitle from '@renderer/components/ui/page-title'
import { Spinner } from '@renderer/components/ui/spinner'
import { format, isToday } from 'date-fns'
import { DashboardCard } from '@renderer/components/DashboardCard'
import { Button } from '@renderer/components/ui/button'
import { ArrowRight, Plus } from 'lucide-react'

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

  type DashboardStats = NonNullable<Awaited<ReturnType<typeof window.api.dashboard.getStats>>>
  type UpcomingReturn = NonNullable<DashboardStats['upcomingReturns']>[number]
  type RecentRental = NonNullable<DashboardStats['recentRentals']>[number]

  // Deduplicate upcoming returns by user + due date
  const uniqueUpcomingReturns = stats?.upcomingReturns?.filter(
    (loan: UpcomingReturn, index: number, self: UpcomingReturn[]) =>
      index ===
      self.findIndex(
        (t) =>
          t.borrower.email === loan.borrower.email &&
          (t.dueDate
            ? new Date(t.dueDate).toDateString() === new Date(loan.dueDate!).toDateString()
            : t.dueDate === loan.dueDate)
      )
  )

  // Deduplicate recent rentals by user + borrowedAt date
  const uniqueRecentRentals = stats?.recentRentals?.filter(
    (loan: RecentRental, index: number, self: RecentRental[]) =>
      index ===
      self.findIndex(
        (t) =>
          t.borrower.email === loan.borrower.email &&
          new Date(t.borrowedAt).toDateString() === new Date(loan.borrowedAt).toDateString()
      )
  )

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Dashboard" />
        <Button asChild>
          <Link to="/rentals/new">
            <Plus className="size-4" /> Issue Book
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-12">
        <Link to="/books" className="hover:opacity-80 transition-opacity">
          <DashboardCard value={(stats?.totalBooks || 0).toString()} label="Books" />
        </Link>
        <Link to="/users" className="hover:opacity-80 transition-opacity">
          <DashboardCard value={(stats?.totalUsers || 0).toString()} label="Users" />
        </Link>
        <Link to="/rentals" className="hover:opacity-80 transition-opacity">
          <DashboardCard value={(stats?.activeRentals || 0).toString()} label="Active Loans" />
        </Link>
        <Link to="/rentals" className="hover:opacity-80 transition-opacity">
          <DashboardCard value={(stats?.rentalsToday || 0).toString()} label="Issued Today" />
        </Link>
        <Link to="/returns-today" className="hover:opacity-80 transition-opacity">
          <DashboardCard
            value={`${stats?.dueTodayRemaining || 0}/${stats?.dueTodayTotal || 0}`}
            label="Returns Today"
          />
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Upcoming Returns</h2>
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
                {!uniqueUpcomingReturns?.length ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-muted-foreground">
                      No upcoming returns.
                    </td>
                  </tr>
                ) : (
                  uniqueUpcomingReturns?.map(
                    (loan: {
                      id: number
                      borrower: { name: string | null; email: string }
                      dueDate: Date | null
                    }) => {
                      const dueToday = loan.dueDate && isToday(new Date(loan.dueDate))
                      return (
                        <tr
                          key={loan.id}
                          className={`border-b last:border-0 hover:bg-muted/50 ${dueToday ? 'bg-yellow-50 hover:bg-yellow-100/50 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30' : ''}`}
                        >
                          <td className="p-4 align-middle">
                            <Link
                              to="/users/$email"
                              params={{ email: loan.borrower.email }}
                              className="hover:underline"
                            >
                              {loan.borrower.name || loan.borrower.email}
                            </Link>
                          </td>
                          <td className="p-4 align-middle">
                            {loan.dueDate
                              ? format(new Date(loan.dueDate), 'MMM d, yyyy')
                              : 'No due date'}
                          </td>
                        </tr>
                      )
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recently Issued</h2>
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
                {!uniqueRecentRentals?.length ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-muted-foreground">
                      No recent rentals.
                    </td>
                  </tr>
                ) : (
                  uniqueRecentRentals?.map(
                    (loan: {
                      id: number
                      borrower: { name: string | null; email: string }
                      borrowedAt: Date
                    }) => (
                      <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-4 align-middle">
                          <Link
                            to="/users/$email"
                            params={{ email: loan.borrower.email }}
                            className="hover:underline"
                          >
                            {loan.borrower.name || loan.borrower.email}
                          </Link>
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
