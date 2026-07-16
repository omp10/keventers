import { useEffect, useState, type ReactNode } from 'react';
import { Button, Card, Input, Spinner, toast } from '@/design-system';
import { ManagementPage } from '@/features/management/components';
import { adminService } from './admin.service';
import type { OnboardingFieldDefinition, OnboardingFieldType } from './types';

const types: OnboardingFieldType[] = ['text', 'email', 'number', 'textarea', 'select', 'file'];
const empty = (): OnboardingFieldDefinition => ({ key: '', label: '', phase: 'application', type: 'text', required: false, enabled: true, helpText: '', placeholder: '', options: [], acceptedFileTypes: [], maxFileSizeMb: 5, multiple: false });

export function OnboardingFieldsPage() {
  const [fields, setFields] = useState<OnboardingFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; adminService.onboardingForm().then((x) => { if (active) setFields(x.fields); }).catch((e: Error) => toast.error('Could not load fields', { description: e.message })).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const change = (i: number, value: Partial<OnboardingFieldDefinition>) => setFields((all) => all.map((field, index) => index === i ? { ...field, ...value } : field));
  const save = async () => { setSaving(true); try { const result = await adminService.updateOnboardingForm(fields); setFields(result.fields); toast.success('Onboarding fields saved'); } catch (e) { toast.error('Could not save fields', { description: (e as Error).message }); } finally { setSaving(false); } };

  return <ManagementPage title="Onboarding fields" description="Manage restaurant application and first-login text fields, uploads, and requirements." actions={<Button loading={saving} onClick={() => void save()}>Save changes</Button>}>
    {loading ? <div className="grid min-h-60 place-items-center"><Spinner /></div> : <div className="space-y-4">
      {fields.map((field, i) => <Card key={`${field.key}-${i}`} padding="lg" className={field.enabled ? '' : 'opacity-60'}>
        <div className="grid gap-4 lg:grid-cols-4">
          <L label="Label"><Input value={field.label} onChange={(e) => change(i, { label: e.target.value })} /></L>
          <L label="Field key"><Input value={field.key} onChange={(e) => change(i, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })} /></L>
          <L label="Phase"><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={field.phase} onChange={(e) => change(i, { phase: e.target.value as OnboardingFieldDefinition['phase'] })}><option value="application">Application</option><option value="setup">First-login setup</option></select></L>
          <L label="Type"><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={field.type} onChange={(e) => change(i, { type: e.target.value as OnboardingFieldType })}>{types.map((type) => <option key={type}>{type}</option>)}</select></L>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><L label="Help text"><Input value={field.helpText} onChange={(e) => change(i, { helpText: e.target.value })} /></L>{field.type === 'file' ? <L label="Accepted types"><Input value={field.acceptedFileTypes.join(', ')} placeholder="image/*, application/pdf" onChange={(e) => change(i, { acceptedFileTypes: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></L> : <L label="Placeholder"><Input value={field.placeholder} onChange={(e) => change(i, { placeholder: e.target.value })} /></L>}</div>
        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm"><Check label="Enabled" checked={field.enabled} onChange={(enabled) => change(i, { enabled })} /><Check label="Required" checked={field.required} onChange={(required) => change(i, { required })} />{field.type === 'file' && <><Check label="Multiple files" checked={field.multiple} onChange={(multiple) => change(i, { multiple })} /><L label="Max MB"><Input className="h-8 w-20" type="number" min={1} max={25} value={field.maxFileSizeMb} onChange={(e) => change(i, { maxFileSizeMb: Number(e.target.value) })} /></L></>}<Button className="ml-auto" size="sm" variant="ghost" onClick={() => setFields((all) => all.filter((_, index) => index !== i))}>Remove</Button></div>
      </Card>)}
      <Button variant="secondary" leftIcon="add" onClick={() => setFields((all) => [...all, empty()])}>Add field</Button>
    </div>}
  </ManagementPage>;
}

function L({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-1 text-sm">{label}{children}</label>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center gap-2"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>; }
