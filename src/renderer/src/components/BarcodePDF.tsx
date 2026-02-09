import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

interface BookWithBarcode {
  isbn: string
  title: string
  barcodeDataUrl: string
  key?: string
}

interface BarcodePDFProps {
  books: BookWithBarcode[]
}

const rows = 12
const columns = 4
const itemsPerPage = rows * columns // 48 items per page

const styles = StyleSheet.create({
  page: {
    padding: 10,
    backgroundColor: '#ffffff',
    paddingBottom: 0
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  barcodeItem: {
    width: '25%',
    padding: 7,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    border: '0.5px solid #e0e0e0'
  },
  title: {
    fontSize: 6,
    textAlign: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  barcodeImage: {
    width: 120,
    height: 34
  },
  isbn: {
    fontSize: 7,
    color: '#666666',
    fontFamily: 'Courier'
  }
})

// Chunk array into pages of itemsPerPage
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export function BarcodePDF({ books }: BarcodePDFProps) {
  const pages = chunkArray(books, itemsPerPage)

  return (
    <Document>
      {pages.map((pageBooks, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <View style={styles.container}>
            {pageBooks.map((book, index) => (
              <View key={index} style={styles.barcodeItem}>
                <Text style={styles.title}>{book.title}</Text>
                <Image style={styles.barcodeImage} src={book.barcodeDataUrl} />
                <Text style={styles.isbn}>{book.isbn}</Text>
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  )
}
