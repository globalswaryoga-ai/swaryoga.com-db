/** @jest-environment node */
jest.mock('@/lib/bunnyCrmSettings', () => ({
  getBunnyCrmUserSettings: jest.fn(),
  findBunnyCrmUserSettingsByPermanentTenantId: jest.fn(),
}));
jest.mock('@/lib/whatsappBridgeConfig', () => ({
  getWhatsAppBridgeConfig: () => ({ url: 'https://bridge.example', secret: 'shared-secret' }),
}));

import {
  findBunnyCrmUserSettingsByPermanentTenantId,
  getBunnyCrmUserSettings,
} from '@/lib/bunnyCrmSettings';
import { resolveQrTenantBridge } from '@/lib/qrTenantBridge';

describe('resolveQrTenantBridge Bunny settings lookup', () => {
  beforeEach(() => jest.clearAllMocks());

  test('resolves the current user settings without a Mongoose lookup', async () => {
    jest.mocked(getBunnyCrmUserSettings).mockResolvedValue({
      userId: 'tenant-a',
      permanentTenantId: '0002457',
      qrBridgeSecret: 'tenant-secret',
      qrConnectedPhoneNumber: '919876543210:4@s.whatsapp.net',
    });

    await expect(resolveQrTenantBridge('tenant-a')).resolves.toMatchObject({
      userId: 'tenant-a',
      ownerUserId: 'tenant-a',
      url: 'https://bridge.example',
      secret: 'tenant-secret',
      sessionKey: '0002457',
      tenantId: '0002457',
      connectedPhone: '919876543210',
    });
    expect(getBunnyCrmUserSettings).toHaveBeenCalledWith('tenant-a');
    expect(findBunnyCrmUserSettingsByPermanentTenantId).not.toHaveBeenCalled();
  });

  test('resolves a stored owner session key from Bunny by permanent tenant ID', async () => {
    jest.mocked(findBunnyCrmUserSettingsByPermanentTenantId).mockResolvedValue({
      userId: 'tenant-owner',
      permanentTenantId: '0002457',
      qrBridgeSecret: 'owner-secret',
    });

    await expect(resolveQrTenantBridge('team-user', '0002457')).resolves.toMatchObject({
      userId: 'team-user',
      ownerUserId: 'tenant-owner',
      sessionKey: '0002457',
      secret: 'owner-secret',
    });
    expect(findBunnyCrmUserSettingsByPermanentTenantId).toHaveBeenCalledWith('0002457');
    expect(getBunnyCrmUserSettings).not.toHaveBeenCalled();
  });

  test('does not invent a session when settings have no permanent tenant ID', async () => {
    jest.mocked(getBunnyCrmUserSettings).mockResolvedValue({ userId: 'tenant-a' });

    await expect(resolveQrTenantBridge('tenant-a')).resolves.toBeNull();
  });
});
