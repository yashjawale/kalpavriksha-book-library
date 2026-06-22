import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import PageTitle from '@renderer/components/ui/page-title'
import { Spinner } from '@renderer/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { format } from 'date-fns'

export const Route = createFileRoute('/')({
  component: Dashboard
})

export default function Dashboard() {
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">books</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{stats?.totalBooks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">users</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">active rentals</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{stats?.activeRentals || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">returns today</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{stats?.returnsToday || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-tight">Upcoming returns</h3>
            <Link to="/returns" className="text-sm text-muted-foreground hover:underline">
              View all -&gt;
            </Link>
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
                {stats?.upcomingReturns?.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-muted-foreground">
                      No upcoming returns.
                    </td>
                  </tr>
                ) : (
                  stats?.upcomingReturns?.map((loan: any) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-tight">Recent rentals</h3>
            <Link to="/rentals" className="text-sm text-muted-foreground hover:underline">
              View all -&gt;
            </Link>
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
                {stats?.recentRentals?.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-muted-foreground">
                      No recent rentals.
                    </td>
                  </tr>
                ) : (
                  stats?.recentRentals?.map((loan: any) => (
                    <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        {loan.borrower.name || loan.borrower.email}
                      </td>
                      <td className="p-4 align-middle">
                        {format(new Date(loan.borrowedAt), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
