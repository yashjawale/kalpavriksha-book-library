import { cn } from '@renderer/lib/utils'

const PageTitle = ({ title, className }: { title: string; className?: string }) => {
  return <h1 className={cn('text-4xl tracking-tight font-bold pb-6 pt-8', className)}>{title}</h1>
}

export default PageTitle
