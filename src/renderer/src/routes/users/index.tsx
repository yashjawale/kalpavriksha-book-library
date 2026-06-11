import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
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
import { Button } from '@renderer/components/ui/button'
import { useSimpleDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

export const Route = createFileRoute('/users/')({
  component: UsersPage
})

type User = {
  name: string | null
  email: string
  _count?: { loans: number }
}

function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  const fetchUsers = async (p: number, q: string) => {
    try {
      const data = (await window.api.users.getAll(p, perPage, q)) as {
        users: User[]
        total: number
      }
      setUsers(data.users)
      setTotalUsers(data.total)
    } catch (err) {
      console.error(err)
    }
  }

  const debouncedSearch = useSimpleDebouncedCallback((val: string) => {
    setPage(1)
    fetchUsers(1, val)
  }, 500)

  useEffect(() => {
    let mounted = true
    window.api.users.getAll(page, perPage, searchQuery).then((data) => {
      if (mounted) {
        const res = data as { users: User[]; total: number }
        setUsers(res.users)
        setTotalUsers(res.total)
      }
    })
    return () => {
      mounted = false
    }
  }, [page]) // searchQuery change handled by debouncedSearch

  const totalPages = Math.ceil(totalUsers / perPage)

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">All Users</h1>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email"
            className="pl-8"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              debouncedSearch(e.target.value)
            }}
          />
        </div>
      </div>

      <Card className="rounded-xl border-border bg-card">
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
              {users.map((user) => (
                <TableRow key={user.email}>
                  <TableCell className="font-medium">{user.name || 'Unknown'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user._count?.loans || 0}</TableCell>
                  <TableCell className="text-right">
                    <Link to="/users/$email" params={{ email: user.email }}>
                      <Button variant="outline" size="sm">
                        View details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No users found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 py-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <div className="text-sm font-medium">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
