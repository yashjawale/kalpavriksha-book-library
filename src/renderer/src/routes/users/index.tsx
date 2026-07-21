import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LoginOverlay } from '@renderer/components/LoginOverlay'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useSimpleDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import { Search } from 'lucide-react'
import PageTitle from '@renderer/components/ui/page-title'
import { PaginationBar } from '@renderer/components/ui/pagination-bar'

export const Route = createFileRoute('/users/')({
  component: UsersPage
})

type User = {
  name: string | null
  email: string
  _count?: { loans: number }
}

function UsersPage() {
  const [authStatus, setAuthStatus] = useState<{
    loggedIn: boolean
    user?: { name?: string; email?: string } | null
  }>({ loggedIn: false })

  useEffect(() => {
    window.api.auth.getStatus().then(setAuthStatus)
  }, [])

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, searchQuery],
    queryFn: async () => {
      const result = await window.api.users.getAll(page, perPage, searchQuery || undefined)
      return result as { users: User[]; total: number }
    },
    staleTime: 30_000
  })

  const users = data?.users ?? []
  const totalUsers = data?.total ?? 0
  const totalPages = Math.ceil(totalUsers / perPage)

  const debouncedSearch = useSimpleDebouncedCallback((val: string) => {
    setSearchQuery(val)
    setPage(1)
  }, 500)

  if (!authStatus.loggedIn) {
    return <LoginOverlay description="You must be logged in to view users." />
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <PageTitle title="Users" />
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email"
            className="pl-8"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              debouncedSearch(e.target.value)
            }}
          />
        </div>
      </div>

      <Card className="rounded-xl border-border bg-card p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[30%]">Name</TableHead>
                <TableHead className="w-[40%]">Email</TableHead>
                <TableHead>Active rentals</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: perPage }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-2/3" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.name || 'Unknown'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user._count?.loans || 0}</TableCell>
                    <TableCell className="text-right">
                      <Link to="/users/$email" params={{ email: user.email }}>
                        <span className="text-sm text-primary hover:underline cursor-pointer">
                          View details
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No users found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <PaginationBar
            currentPage={page - 1}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p + 1)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
