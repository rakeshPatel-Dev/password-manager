import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { DecryptedEntry, DecryptedFolder } from '../types'

interface VaultExportPdfInput {
  folders: DecryptedFolder[]
  entries: DecryptedEntry[]
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function countEntries(folderId: number, entries: DecryptedEntry[]): string {
  return String(entries.filter((entry) => entry.folderId === folderId).length)
}

export function downloadVaultPdf({ folders, entries }: VaultExportPdfInput): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 36
  const accentColor: [number, number, number] = [24, 58, 107]
  const inkColor: [number, number, number] = [15, 23, 42]
  const mutedColor: [number, number, number] = [71, 85, 105]
  const softBg: [number, number, number] = [248, 250, 252]
  const borderColor: [number, number, number] = [226, 232, 240]
  const generatedAt = formatDate(new Date().toISOString())
  const folderMap = new Map(folders.map((folder) => [folder.id, folder.name]))

  doc.setProperties({
    title: 'PassVault Vault Backup',
    subject: 'Human-readable vault export',
    author: 'PassVault',
    creator: 'PassVault',
  })

  doc.setFillColor(...accentColor)
  doc.rect(0, 0, pageWidth, 128, 'F')
  doc.setFillColor(10, 19, 34)
  doc.rect(0, 0, pageWidth, 12, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.text('Vault Backup', margin, 56)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Readable export with folders and credential data only', margin, 78)
  doc.text(`Generated ${generatedAt}`, margin, 96)

  const summaryStartX = pageWidth - margin - 360
  const summaryCardWidth = 108
  const summaryCardHeight = 52
  const summaryY = 34
  const summaryValues = [
    { label: 'Folders', value: String(folders.length) },
    { label: 'Entries', value: String(entries.length) },
    { label: 'Sections', value: '2' },
  ]

  summaryValues.forEach((item, index) => {
    const x = summaryStartX + index * (summaryCardWidth + 12)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, summaryY, summaryCardWidth, summaryCardHeight, 10, 10, 'F')
    doc.setTextColor(...accentColor)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(item.value, x + 14, summaryY + 22)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(item.label, x + 14, summaryY + 39)
  })

  doc.setTextColor(...inkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('What is included', margin, 166)
  doc.setDrawColor(...borderColor)
  doc.setLineWidth(1)
  doc.line(margin, 174, pageWidth - margin, 174)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...mutedColor)
  doc.text('This PDF intentionally excludes internal metadata, recovery envelopes, and encryption blobs.', margin, 192)

  autoTable(doc, {
    startY: 210,
    margin: { left: margin, right: margin },
    head: [['Folder', 'Entries']],
    body: folders.length > 0
      ? folders.map((folder) => [folder.name, countEntries(folder.id, entries)])
      : [['No folders', '0']],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 7,
      textColor: inkColor,
      lineColor: borderColor,
      lineWidth: 0.8,
    },
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: softBg,
    },
    columnStyles: {
      1: { halign: 'center' },
    },
    didDrawPage: () => {
      doc.setTextColor(...mutedColor)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 22, { align: 'right' })
    },
  })

  const lastTable = doc as jsPDF & { lastAutoTable?: { finalY: number } }
  const entriesStartY = lastTable.lastAutoTable?.finalY ?? 210

  doc.setTextColor(...inkColor)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Vault Entries', margin, entriesStartY + 28)

  autoTable(doc, {
    startY: entriesStartY + 36,
    margin: { left: margin, right: margin },
    head: [['Title', 'Folder', 'Username', 'Email', 'Website', 'Password', 'Notes']],
    body: entries.length > 0
      ? entries.map((entry) => [
          entry.title,
          entry.folderId ? folderMap.get(entry.folderId) ?? 'Uncategorized' : 'Uncategorized',
          entry.username,
          entry.email,
          entry.website,
          entry.password,
          entry.notes,
        ])
      : [['No entries', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 6,
      textColor: inkColor,
      lineColor: borderColor,
      lineWidth: 0.6,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: [13, 110, 253],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: softBg,
    },
    columnStyles: {
      0: { cellWidth: 88 },
      1: { cellWidth: 86 },
      2: { cellWidth: 92 },
      3: { cellWidth: 108 },
      4: { cellWidth: 112 },
      5: { cellWidth: 108 },
      6: { cellWidth: 'auto' },
    },
    didDrawPage: () => {
      doc.setTextColor(...mutedColor)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 22, { align: 'right' })
    },
  })

  doc.save(`passvault-vault-backup-${Date.now()}.pdf`)
}