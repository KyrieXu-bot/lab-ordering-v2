import React from 'react'
import PortalLayout from '../components/PortalLayout'
import FormPage from './FormPage'

export default function NewRequestPage() {
  return <PortalLayout wide><FormPage workflowMode="request" /></PortalLayout>
}
