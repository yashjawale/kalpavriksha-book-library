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
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Users as UsersIcon } from 'lucide-react'

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

  useEffect(() => {
    let mounted = true
    window.api.users.getAll().then((data) => {
      if (mounted) setUsers(data as User[])
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" /> All Registered Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total Rentals</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.email}>
                  <TableCell className="font-medium">{user.name || 'Unknown'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user._count?.loans || 0}</TableCell>
                  <TableCell>
                    <Link
                      to="/users/$email"
                      params={{ email: user.email }}
                      className="text-primary hover:underline font-semibold"
                    >
                      View Details
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                    No users found. Users are created automatically when they rent a book.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
