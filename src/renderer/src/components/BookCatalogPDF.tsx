import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

interface Book {
  isbn: string
  title: string
  totalStock: number
  createdAt: Date
}

interface BookCatalogPDFProps {
  books: Book[]
  logoDataUrl: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontSize: 10
  },
  header: {
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottom: '2px solid #333333',
    paddingBottom: 15
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15
  },
  headerText: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 10,
    color: '#666666'
  },
  dateText: {
    fontSize: 8,
    color: '#999999',
    marginTop: 2
  },
  summary: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4
  },
  summaryText: {
    fontSize: 10,
    color: '#333333',
    marginBottom: 2
  },
  table: {
    display: 'flex',
    width: '100%',
    marginTop: 10
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#333333',
    color: '#ffffff',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 10
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: '1px solid #dddddd',
    padding: 8,
    fontSize: 9
  },
  tableRowAlt: {
    backgroundColor: '#f9f9f9'
  },
  colNo: {
    width: '8%'
  },
  colTitle: {
    width: '52%'
  },
  colISBN: {
    width: '25%'
  },
  colStock: {
    width: '15%',
    textAlign: 'right'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
    borderTop: '1px solid #dddddd',
    paddingTop: 10
  }
})

export function BookCatalogPDF({ books, logoDataUrl }: BookCatalogPDFProps) {
  const totalStock = books.reduce((sum, book) => sum + book.totalStock, 0)
  const generatedDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoDataUrl} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Book Library Catalog</Text>
            <Text style={styles.subtitle}>Complete inventory report</Text>
            <Text style={styles.dateText}>Generated on {generatedDate}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>Total Books: {books.length}</Text>
          <Text style={styles.summaryText}>Total Stock Count: {totalStock}</Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colTitle}>Title</Text>
            <Text style={styles.colISBN}>ISBN</Text>
            <Text style={styles.colStock}>Stock</Text>
          </View>

          {books.map((book, index) => (
            <View
              key={book.isbn}
              style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}
            >
              <Text style={styles.colNo}>{index + 1}</Text>
              <Text style={styles.colTitle}>{book.title}</Text>
              <Text style={styles.colISBN}>{book.isbn}</Text>
              <Text style={styles.colStock}>{book.totalStock}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Kalpavriksha Book Library Management System • Page 1 of 1</Text>
      </Page>
    </Document>
  )
}
