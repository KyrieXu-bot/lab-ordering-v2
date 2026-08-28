import React from 'react'
import { useParams } from 'react-router-dom'
import PortalLayout from '../components/PortalLayout'
import FormPage from './FormPage'

export default function AdditionalTestRequestPage() {
  const { id } = useParams()
  return <PortalLayout wide><FormPage workflowMode="additionalTest" requestId={id} /></PortalLayout>
}
