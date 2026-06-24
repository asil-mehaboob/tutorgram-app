import { tutorApiRequest } from './tutor-client';

export type TutorProfile = {
  id: string;
  fullName: string;
  professionalTitle: string | null;
  bio: string | null;
  profilePicture: string | null;
  primaryCredibility: string | null;
  rating: number;
  isVerified: boolean;
  isApproved: boolean;
  socialLinks: TutorSocialLink[];
  experience: TutorExperience[];
  education: TutorEducation[];
  certifications: TutorCertification[];
  awards: TutorAward[];
  services: TutorService[];
};

export type TutorSocialLink = {
  id: string;
  platform: string;
  url: string;
};

export type TutorExperience = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};

export type TutorEducation = {
  id: string;
  institution: string;
  degree: string;
  field: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
};

export type TutorCertification = {
  id: string;
  name: string;
  issuer: string;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
};

export type TutorAward = {
  id: string;
  title: string;
  issuer: string | null;
  date: string | null;
  description: string | null;
};

export type TutorService = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  isActive: boolean;
};

// ─── Profile ────────────────────────────────────────────────────────────────

export async function getTutorProfile(): Promise<TutorProfile> {
  return tutorApiRequest<TutorProfile>('/api/tutor-profile');
}

export async function updateTutorProfile(
  data: Partial<Pick<TutorProfile, 'fullName' | 'professionalTitle' | 'bio' | 'profilePicture' | 'primaryCredibility'>>,
): Promise<TutorProfile> {
  return tutorApiRequest<TutorProfile>('/api/tutor-profile', { method: 'PUT', body: data });
}

// ─── Experience ──────────────────────────────────────────────────────────────
// No dedicated GET — data comes from the full profile endpoint.

export async function getExperience(): Promise<TutorExperience[]> {
  const profile = await tutorApiRequest<TutorProfile>('/api/tutor-profile');
  return profile.experience ?? [];
}

export async function createExperience(data: Omit<TutorExperience, 'id'>): Promise<TutorExperience> {
  return tutorApiRequest<TutorExperience>('/api/tutor-profile/experience', { method: 'POST', body: data });
}

export async function updateExperience(id: string, data: Partial<Omit<TutorExperience, 'id'>>): Promise<TutorExperience> {
  return tutorApiRequest<TutorExperience>('/api/tutor-profile/experience', { method: 'PUT', body: { id, ...data } });
}

export async function deleteExperience(id: string): Promise<void> {
  await tutorApiRequest('/api/tutor-profile/experience', { method: 'DELETE', body: { id } });
}

// ─── Education ───────────────────────────────────────────────────────────────

export async function getEducation(): Promise<TutorEducation[]> {
  const profile = await tutorApiRequest<TutorProfile>('/api/tutor-profile');
  return profile.education ?? [];
}

export async function createEducation(data: Omit<TutorEducation, 'id'>): Promise<TutorEducation> {
  return tutorApiRequest<TutorEducation>('/api/tutor-profile/education', { method: 'POST', body: data });
}

export async function updateEducation(id: string, data: Partial<Omit<TutorEducation, 'id'>>): Promise<TutorEducation> {
  return tutorApiRequest<TutorEducation>('/api/tutor-profile/education', { method: 'PUT', body: { id, ...data } });
}

export async function deleteEducation(id: string): Promise<void> {
  await tutorApiRequest('/api/tutor-profile/education', { method: 'DELETE', body: { id } });
}

// ─── Certifications ───────────────────────────────────────────────────────────

export async function getCertifications(): Promise<TutorCertification[]> {
  const profile = await tutorApiRequest<TutorProfile>('/api/tutor-profile');
  return profile.certifications ?? [];
}

export async function createCertification(data: Omit<TutorCertification, 'id'>): Promise<TutorCertification> {
  return tutorApiRequest<TutorCertification>('/api/tutor-profile/certifications', { method: 'POST', body: data });
}

export async function updateCertification(id: string, data: Partial<Omit<TutorCertification, 'id'>>): Promise<TutorCertification> {
  return tutorApiRequest<TutorCertification>('/api/tutor-profile/certifications', { method: 'PUT', body: { id, ...data } });
}

export async function deleteCertification(id: string): Promise<void> {
  await tutorApiRequest('/api/tutor-profile/certifications', { method: 'DELETE', body: { id } });
}

// ─── Awards ───────────────────────────────────────────────────────────────────

export async function getAwards(): Promise<TutorAward[]> {
  const profile = await tutorApiRequest<TutorProfile>('/api/tutor-profile');
  return profile.awards ?? [];
}

export async function createAward(data: Omit<TutorAward, 'id'>): Promise<TutorAward> {
  return tutorApiRequest<TutorAward>('/api/tutor-profile/awards', { method: 'POST', body: data });
}

export async function updateAward(id: string, data: Partial<Omit<TutorAward, 'id'>>): Promise<TutorAward> {
  return tutorApiRequest<TutorAward>('/api/tutor-profile/awards', { method: 'PUT', body: { id, ...data } });
}

export async function deleteAward(id: string): Promise<void> {
  await tutorApiRequest('/api/tutor-profile/awards', { method: 'DELETE', body: { id } });
}

// ─── Services ─────────────────────────────────────────────────────────────────

export async function getServices(): Promise<TutorService[]> {
  const profile = await tutorApiRequest<TutorProfile>('/api/tutor-profile');
  return profile.services ?? [];
}

export async function createService(data: Omit<TutorService, 'id'>): Promise<TutorService> {
  return tutorApiRequest<TutorService>('/api/tutor-profile/services', { method: 'POST', body: data });
}

export async function updateService(id: string, data: Partial<Omit<TutorService, 'id'>>): Promise<TutorService> {
  return tutorApiRequest<TutorService>('/api/tutor-profile/services', { method: 'PUT', body: { id, ...data } });
}

export async function deleteService(id: string): Promise<void> {
  await tutorApiRequest('/api/tutor-profile/services', { method: 'DELETE', body: { id } });
}

// ─── Social Links ─────────────────────────────────────────────────────────────

export async function getSocialLinks(): Promise<TutorSocialLink[]> {
  const profile = await tutorApiRequest<TutorProfile>('/api/tutor-profile');
  return profile.socialLinks ?? [];
}

// Backend expects PUT with body { socialLinks: [{ platform, url }] }
export async function upsertSocialLinks(links: { platform: string; url: string }[]): Promise<TutorSocialLink[]> {
  return tutorApiRequest<TutorSocialLink[]>('/api/tutor-profile/social-links', { method: 'PUT', body: { socialLinks: links } });
}

// ─── S3 presign ───────────────────────────────────────────────────────────────

export async function presignUpload(
  filename: string,
  contentType: string,
): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  return tutorApiRequest<{ uploadUrl: string; fileKey: string; publicUrl: string }>('/api/upload/presign', {
    method: 'POST',
    body: { filename, contentType },
  });
}
