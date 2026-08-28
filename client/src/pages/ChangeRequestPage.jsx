import React from 'react'
import { useParams } from 'react-router-dom'
import PortalLayout from '../components/PortalLayout'
import FormPage from './FormPage'

export default function ChangeRequestPage() {
  const { id } = useParams()
  return <PortalLayout wide><FormPage workflowMode="change" requestId={id} /></PortalLayout>
}
