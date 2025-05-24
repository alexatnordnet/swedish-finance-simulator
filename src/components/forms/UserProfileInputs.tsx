interface UserProfile {
  currentAge: number;
  gender: 'man' | 'kvinna';
  desiredRetirementAge: number;
}

interface UserProfileInputsProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
}

export function UserProfileInputs({ profile, onUpdate }: UserProfileInputsProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-700">Personliga uppgifter</h3>
      
      <div>
        <label className="label">Nuvarande ålder</label>
        <input
          type="number"
          value={profile.currentAge}
          onChange={(e) => onUpdate({ 
            currentAge: parseInt(e.target.value) || 0 
          })}
          className="input-field"
          min="16"
          max="80"
        />
      </div>
      
      <div>
        <label className="label">Kön</label>
        <select
          value={profile.gender}
          onChange={(e) => onUpdate({ 
            gender: e.target.value as 'man' | 'kvinna' 
          })}
          className="input-field"
        >
          <option value="kvinna">Kvinna</option>
          <option value="man">Man</option>
        </select>
      </div>
      
      <div>
        <label className="label">Önskad pensionsålder</label>
        <input
          type="number"
          value={profile.desiredRetirementAge}
          onChange={(e) => onUpdate({ 
            desiredRetirementAge: parseInt(e.target.value) || 65 
          })}
          className="input-field"
          min="55"
          max="75"
        />
      </div>
    </div>
  );
}