/**
 * TrọCare Mobile — Facility Store (Zustand)
 * Manages facilities and rooms data caching.
 * Persists cached data using expo-secure-store storage to support offline capability.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { apiGet } from '@/lib/api';

// ─── Custom SecureStore Adapter for Zustand Persist ───
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return (await SecureStore.getItemAsync(name)) || null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {}
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {}
  },
};

interface Facility {
  id: string;
  name: string;
  address?: string;
  status?: string;
  room_count?: number;
  roomCount?: number;
  vacant_count?: number;
  vacantCount?: number;
  occupied_count?: number;
  occupiedCount?: number;
  maintenance_count?: number;
  maintenanceCount?: number;
}

interface FacilityDetail {
  id: string;
  name: string;
  address?: string;
  status?: string;
  description?: string;
  rooms?: any[];
}

interface FacilityState {
  facilities: Facility[];
  facilityDetails: Record<string, FacilityDetail>;
  rooms: Record<string, any>;
  lastUpdated: number;

  // Actions
  setFacilities: (facilities: Facility[]) => void;
  setFacilityDetail: (facilityId: string, detail: FacilityDetail) => void;
  setRoomDetail: (roomId: string, detail: any) => void;
  
  // API Fetch wrappers with Cache Fallback
  fetchFacilities: (forceRefresh?: boolean) => Promise<Facility[]>;
  fetchFacilityDetail: (facilityId: string, forceRefresh?: boolean) => Promise<FacilityDetail>;
  fetchRoomDetail: (roomId: string, forceRefresh?: boolean) => Promise<any>;
  clearCache: () => void;
}

export const useFacilityStore = create<FacilityState>()(
  persist(
    (set, get) => ({
      facilities: [],
      facilityDetails: {},
      rooms: {},
      lastUpdated: 0,

      setFacilities: (facilities) => {
        set({ facilities, lastUpdated: Date.now() });
      },

      setFacilityDetail: (facilityId, detail) => {
        set((state) => ({
          facilityDetails: {
            ...state.facilityDetails,
            [facilityId]: detail,
          },
          lastUpdated: Date.now(),
        }));
      },

      setRoomDetail: (roomId, detail) => {
        set((state) => ({
          rooms: {
            ...state.rooms,
            [roomId]: detail,
          },
          lastUpdated: Date.now(),
        }));
      },

      fetchFacilities: async (forceRefresh = false) => {
        const state = get();
        // If we have cached data and not forcing refresh, return cache first
        if (!forceRefresh && state.facilities.length > 0 && Date.now() - state.lastUpdated < 300000) {
          return state.facilities;
        }

        try {
          const res = await apiGet<any>('/owner/boarding-houses');
          const data = res?.data ?? res ?? [];
          set({ facilities: data, lastUpdated: Date.now() });
          return data;
        } catch (error) {
          // If offline or error, return cache if available
          if (state.facilities.length > 0) {
            return state.facilities;
          }
          throw error;
        }
      },

      fetchFacilityDetail: async (facilityId, forceRefresh = false) => {
        const state = get();
        const cached = state.facilityDetails[facilityId];
        // Cache validity: 5 minutes
        if (!forceRefresh && cached && Date.now() - state.lastUpdated < 300000) {
          return cached;
        }

        try {
          const [facRes, roomsRes] = await Promise.all([
            apiGet<any>(`/owner/boarding-houses/${facilityId}`),
            apiGet<any>(`/rental/rooms?buildingId=${facilityId}`),
          ]);

          const facilityData = facRes?.data ?? facRes;
          const roomsData = (roomsRes?.data ?? []).filter((room: any) => {
            const roomFacilityId = room.boarding_house_id ?? room.boardingHouseId ?? room.building_id ?? room.facility_id;
            return String(roomFacilityId) === String(facilityId);
          });

          const detailedFacility = {
            ...facilityData,
            rooms: roomsData,
          };

          // Cache individual rooms in room cache
          roomsData.forEach((room: any) => {
            get().setRoomDetail(room.id, room);
          });

          get().setFacilityDetail(facilityId, detailedFacility);
          return detailedFacility;
        } catch (error) {
          if (cached) {
            return cached;
          }
          throw error;
        }
      },

      fetchRoomDetail: async (roomId, forceRefresh = false) => {
        const state = get();
        const cached = state.rooms[roomId];
        if (!forceRefresh && cached && Date.now() - state.lastUpdated < 300000) {
          return cached;
        }

        try {
          const res = await apiGet<any>(`/rental/rooms/${roomId}`);
          const data = res?.data ?? res;
          get().setRoomDetail(roomId, data);
          return data;
        } catch (error) {
          if (cached) {
            return cached;
          }
          throw error;
        }
      },

      clearCache: () => {
        set({ facilities: [], facilityDetails: {}, rooms: {}, lastUpdated: 0 });
      },
    }),
    {
      name: 'trocare_facility_cache_v2',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
