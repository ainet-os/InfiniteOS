import assert from 'node:assert/strict'
import test from 'node:test'

import { buildVmDomainXml, parseVmDomainXml } from '../src/services/vmXmlService.js'

test('buildVmDomainXml changes reboot lifecycle action to restart', () => {
  const domain = parseVmDomainXml(`
<domain type="kvm">
  <name>reboot-policy-test</name>
  <memory unit="KiB">1048576</memory>
  <currentMemory unit="KiB">1048576</currentMemory>
  <vcpu>1</vcpu>
  <os>
    <type arch="x86_64" machine="pc">hvm</type>
    <boot dev="hd"/>
  </os>
  <devices>
    <emulator>/usr/bin/qemu-system-x86_64</emulator>
  </devices>
  <on_reboot>destroy</on_reboot>
</domain>
`)

  const xml = buildVmDomainXml(domain)

  assert.match(xml, /<on_reboot>restart<\/on_reboot>/)
  assert.doesNotMatch(xml, /<on_reboot>destroy<\/on_reboot>/)
})
