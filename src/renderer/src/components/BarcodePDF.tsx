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

const styles = StyleSheet.create({
  page: {
    padding: 10,
    backgroundColor: '#ffffff'
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  barcodeItem: {
    width: '25%',
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    border: '0.5px solid #e0e0e0'
  },
  title: {
    fontSize: 6,
    fontWeight: 'bold',
    textAlign: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  barcodeImage: {
    width: 120,
    height: 30,
    marginVertical: 1
  },
  isbn: {
    fontSize: 6,
    color: '#666666',
    fontFamily: 'Courier'
  }
})

export function BarcodePDF({ books }: BarcodePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          {books.map((book, index) => (
            <View key={book.key || `${book.isbn}-${index}`} style={styles.barcodeItem}>
              <Text style={styles.title}>{book.title}</Text>
              <Image src={book.barcodeDataUrl} style={styles.barcodeImage} />
              <Text style={styles.isbn}>{book.isbn}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
