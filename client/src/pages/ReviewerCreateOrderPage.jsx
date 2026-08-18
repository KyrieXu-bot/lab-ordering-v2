import React from 'react'
import PortalLayout from '../components/PortalLayout'
import FormPage from './FormPage'

export default function ReviewerCreateOrderPage() {
  return <PortalLayout wide><FormPage workflowMode="direct" /></PortalLayout>
}
