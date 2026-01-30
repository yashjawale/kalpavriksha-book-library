import { createFileRoute } from '@tanstack/react-router'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/')({
  component: Index
})

function Index() {
  // Access the client
  const queryClient = useQueryClient()

  // Queries
  const query = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      return ['todo1', 'todo2']
    }
  })

  // Mutations
  const mutation = useMutation({
    mutationFn: async (newTodo: string) => {
      console.log('ran')
      return [...(query.data || []), newTodo]
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })

  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <div>
        Todos:{' '}
        {query.data?.map((todo, index) => (
          <div key={index}>{todo}</div>
        ))}
      </div>
      <button
        onClick={() => {
          console.log('click')
          mutation.mutate('new todo')
        }}
      >
        Add Todo
      </button>
    </div>
  )
}
