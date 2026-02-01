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
    padding: 30,
    backgroundColor: '#ffffff'
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15
  },
  barcodeItem: {
    width: '30%',
    border: '1px solid #cccccc',
    padding: 6,
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  title: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    maxWidth: '100%'
  },
  barcodeImage: {
    width: 130,
    height: 35,
    marginVertical: 3
  },
  isbn: {
    fontSize: 7,
    color: '#666666',
    fontFamily: 'Courier',
    marginTop: 2
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
