/**
 * Component render tests for QR WhatsApp extracted components
 * Tests that components render correctly with given props and handle interactions.
 * @module app/admin/crm/qr/components
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Lightbox, GroupCreateModal } from '@/app/admin/crm/qr/components/Lightbox';
import { EditFunnelLabelModal } from '@/app/admin/crm/qr/components/EditFunnelLabelModal';
import { ExtensionModal, InstallGuideModal } from '@/app/admin/crm/qr/components/ExtensionModals';

// ── Lightbox ──
describe('Lightbox', () => {
  it('renders nothing when lightboxImage is null', () => {
    const { container } = render(
      <Lightbox lightboxImage={null} setLightboxImage={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders image when lightboxImage is provided', () => {
    render(
      <Lightbox lightboxImage="https://example.com/photo.jpg" setLightboxImage={jest.fn()} />
    );
    const img = screen.getByAltText('Full-screen');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('calls setLightboxImage(null) when backdrop is clicked', () => {
    const mockSetLightbox = jest.fn();
    const { container } = render(
      <Lightbox lightboxImage="https://example.com/photo.jpg" setLightboxImage={mockSetLightbox} />
    );
    // Click the backdrop (outer div)
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(mockSetLightbox).toHaveBeenCalledWith(null);
  });

  it('calls setLightboxImage(null) when close button is clicked', () => {
    const mockSetLightbox = jest.fn();
    render(
      <Lightbox lightboxImage="https://example.com/photo.jpg" setLightboxImage={mockSetLightbox} />
    );
    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);
    expect(mockSetLightbox).toHaveBeenCalledWith(null);
  });
});

// ── GroupCreateModal ──
describe('GroupCreateModal', () => {
  const defaultProps = {
    showGroupCreate: true,
    setShowGroupCreate: jest.fn(),
    newGroupName: '',
    setNewGroupName: jest.fn(),
    newGroupMembers: '',
    setNewGroupMembers: jest.fn(),
    creatingGroup: false,
    handleCreateGroup: jest.fn(),
  };

  it('renders nothing when showGroupCreate is false', () => {
    const { container } = render(
      <GroupCreateModal {...defaultProps} showGroupCreate={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal content when showGroupCreate is true', () => {
    render(<GroupCreateModal {...defaultProps} />);
    expect(screen.getByText('New Group')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter group name')).toBeInTheDocument();
  });

  it('disables Create button when name is empty', () => {
    render(<GroupCreateModal {...defaultProps} newGroupName="" />);
    const btn = screen.getByText('Create Group');
    expect(btn.closest('button')).toBeDisabled();
  });

  it('enables Create button when name and a member are provided', () => {
    render(<GroupCreateModal {...defaultProps} newGroupName="Test Group" newGroupMembers="919876543210" />);
    const btn = screen.getByText('Create Group');
    expect(btn.closest('button')).not.toBeDisabled();
  });

  it('calls handleCreateGroup when create button is clicked', () => {
    const mockCreate = jest.fn();
    render(<GroupCreateModal {...defaultProps} newGroupName="Test Group" newGroupMembers="919876543210" handleCreateGroup={mockCreate} />);
    const btn = screen.getByText('Create Group');
    fireEvent.click(btn.closest('button')!);
    expect(mockCreate).toHaveBeenCalled();
  });

  it('shows "Creating..." when creatingGroup is true', () => {
    render(<GroupCreateModal {...defaultProps} creatingGroup={true} />);
    expect(screen.getByText('Creating...')).toBeInTheDocument();
  });
});

// ── EditFunnelLabelModal ──
describe('EditFunnelLabelModal', () => {
  const defaultProps = {
    editModal: { type: 'funnel' as const, mode: 'add' as const },
    setEditModal: jest.fn(),
    editName: '',
    setEditName: jest.fn(),
    editColor: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    setEditColor: jest.fn(),
    saveEditModal: jest.fn(),
    deleteFromModal: jest.fn(),
  };

  it('renders nothing when editModal is null', () => {
    const { container } = render(
      <EditFunnelLabelModal {...defaultProps} editModal={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders "Add Funnel Stage" for add/funnel mode', () => {
    render(<EditFunnelLabelModal {...defaultProps} />);
    expect(screen.getByText('Add Funnel Stage')).toBeInTheDocument();
  });

  it('renders "Edit Label" for edit/label mode', () => {
    render(
      <EditFunnelLabelModal
        {...defaultProps}
        editModal={{ type: 'label', mode: 'edit', item: { key: 'vip', label: 'VIP', color: 'bg-amber-100 text-amber-800' } }}
        editName="VIP"
      />
    );
    expect(screen.getByText('Edit Label')).toBeInTheDocument();
  });

  it('shows Delete button only in edit mode', () => {
    render(
      <EditFunnelLabelModal
        {...defaultProps}
        editModal={{ type: 'funnel', mode: 'edit', item: { key: 'new_lead', label: 'New Lead', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' } }}
        editName="New Lead"
      />
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('does not show Delete button in add mode', () => {
    render(<EditFunnelLabelModal {...defaultProps} />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('disables Add button when editName is empty', () => {
    render(<EditFunnelLabelModal {...defaultProps} editName="" />);
    const addBtn = screen.getByText('Add');
    expect(addBtn.closest('button')).toBeDisabled();
  });

  it('calls saveEditModal when Add button is clicked', () => {
    const mockSave = jest.fn();
    render(<EditFunnelLabelModal {...defaultProps} editName="New Stage" saveEditModal={mockSave} />);
    const addBtn = screen.getByText('Add');
    fireEvent.click(addBtn);
    expect(mockSave).toHaveBeenCalled();
  });
});

// ── ExtensionModal ──
describe('ExtensionModal', () => {
  const defaultProps = {
    showExtensionModal: true,
    setShowExtensionModal: jest.fn(),
    handleDownloadInstaller: jest.fn(),
    downloadingExtension: false,
  };

  it('renders nothing when showExtensionModal is false', () => {
    const { container } = render(
      <ExtensionModal {...defaultProps} showExtensionModal={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal title', () => {
    render(<ExtensionModal {...defaultProps} />);
    expect(screen.getByText('QR WhatsApp PC Extension')).toBeInTheDocument();
  });

  it('calls handleDownloadInstaller on button click', () => {
    const mockDownload = jest.fn();
    render(<ExtensionModal {...defaultProps} handleDownloadInstaller={mockDownload} />);
    const btn = screen.getByText('Download & Install');
    fireEvent.click(btn.closest('button')!);
    expect(mockDownload).toHaveBeenCalled();
  });

  it('shows downloading state', () => {
    render(<ExtensionModal {...defaultProps} downloadingExtension={true} />);
    expect(screen.getByText('Downloading...')).toBeInTheDocument();
  });
});

// ── InstallGuideModal ──
describe('InstallGuideModal', () => {
  it('renders nothing when showInstallGuide is false', () => {
    const { container } = render(
      <InstallGuideModal showInstallGuide={false} setShowInstallGuide={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal content when shown', () => {
    render(<InstallGuideModal showInstallGuide={true} setShowInstallGuide={jest.fn()} />);
    expect(screen.getByText('✅ Almost Done!')).toBeInTheDocument();
    expect(screen.getByText('Step 1: Open Terminal')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Run the Installer')).toBeInTheDocument();
  });

  it('calls setShowInstallGuide(false) when close button is clicked', () => {
    const mockClose = jest.fn();
    render(<InstallGuideModal showInstallGuide={true} setShowInstallGuide={mockClose} />);
    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);
    expect(mockClose).toHaveBeenCalledWith(false);
  });
});
