import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '@/api/user'
import { useAuth } from '@/context/AuthContext'

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: (name: string) => userApi.updateProfile(name),
    onSuccess: (user) => {
      queryClient.setQueryData(['profile'], user)
      // Keep the Navbar avatar/name (read from AuthContext, not this query)
      // in sync immediately rather than waiting for a page reload.
      setUser(user)
    },
  })
}
