export const BLACK_HOLE_SHADER = `
struct Uniforms {
  time: f32,
  spin: f32,
  disk_intensity: f32,
  lensing_enabled: f32,
  resolution: vec2f,
  camera_pos: vec3f,
  camera_dir: vec3f,
  camera_up: vec3f,
};

@group(0) @binding(0) var<uniform> params: Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) uv : vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  var output : VertexOutput;
  output.Position = vec4f(positions[VertexIndex], 0.0, 1.0);
  output.uv = positions[VertexIndex] * 0.5 + 0.5;
  return output;
}

// --- CONSTANTS ---
const PI: f32 = 3.14159265;
const C: f32 = 1.0; // Speed of light (normalized)
const G: f32 = 1.0; // Gravitational constant
const M: f32 = 1.0; // Mass of Black Hole
const RS: f32 = 2.0; // Schwarzschild Radius (2GM/c^2)

// --- NOISE FUNCTIONS ---
fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
}

fn noise(x: vec2f) -> f32 {
    let i = floor(x);
    let f = fract(x);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2f(0.0, 0.0)), hash(i + vec2f(1.0, 0.0)), u.x),
               mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x), u.y);
}

fn fbm(p: vec2f) -> f32 {
    var v = 0.0;
    var a = 0.5;
    var shift = vec2f(100.0);
    var rot = mat2x2f(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    var pp = p;
    for (var i = 0; i < 5; i++) {
        v += a * noise(pp);
        pp = rot * pp * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

// --- PHYSICS HELPERS ---

// Blackbody-ish palette with intensity mapping
fn blackbody(temp: f32) -> vec3f {
    let t = clamp(temp, 0.0, 1.0);
    // Cold -> Red -> Orange -> White -> Blueish
    return vec3f(
        min(t * 3.0, 1.0) + max(0.0, t - 0.5), 
        min(t * 1.5, 1.0) * smoothstep(0.1, 0.5, t), 
        min(t * 0.5, 1.0) * smoothstep(0.4, 0.8, t) + max(0.0, t - 0.9)
    );
}

@fragment
fn fs_main(@location(0) uv : vec2f) -> @location(0) vec4f {
    // 1. Setup Camera Ray
    let aspect = params.resolution.x / params.resolution.y;
    let ndc = (uv - 0.5) * 2.0;
    let screen_uv = vec2f(ndc.x * aspect, -ndc.y);

    let cam_pos = params.camera_pos;
    let cam_dir = normalize(params.camera_dir);
    
    // Gram-Schmidt / LookAt basis
    let world_up = vec3f(0.0, 1.0, 0.0);
    let right = normalize(cross(cam_dir, world_up));
    let up = cross(right, cam_dir);
    
    // Initial Ray State
    var ro = cam_pos;
    var rd = normalize(cam_dir * 1.5 + right * screen_uv.x + up * screen_uv.y);

    // 2. Integration State
    var pos = ro;
    var vel = rd; // Light velocity direction (magnitude c=1)
    
    // Accumulators
    var color = vec3f(0.0);
    var transmittance = 1.0;
    
    // Physics Parameters
    let spin_a = clamp(params.spin, 0.0, 0.99); // Kerr spin parameter
    let horizon_r = 1.0 + sqrt(1.0 - spin_a * spin_a); // Event horizon radius for Kerr
    let isco = 3.0 + sqrt(3.0 * (3.0 - 2.0 * spin_a)); // Approximation for ISCO
    let accretion_min = isco * 0.9;
    let accretion_max = 12.0;

    let max_steps = 120;
    var step_dist = 0.0;
    
    // --- RAY MARCHING LOOP ---
    for (var i = 0; i < max_steps; i++) {
        let r2 = dot(pos, pos);
        let r = sqrt(r2);
        
        if (r < horizon_r) {
            // Hit Event Horizon
            color += vec3f(0.0) * transmittance; // Black hole is black
            transmittance = 0.0;
            break;
        }

        // --- DISK INTERSECTION & VOLUMETRIC RENDERING ---
        // Check proximity to equatorial plane (y=0)
        let dist_to_plane = abs(pos.y);
        
        // Disk thickness profile (flares out slightly)
        let disk_h = 0.05 + 0.01 * r * r * 0.1;
        
        if (transmittance > 0.01 && r > accretion_min && r < accretion_max && dist_to_plane < disk_h) {
            // We are inside the accretion disk volume
            
            // 1. Calculate Gas Velocity (Keplerian approx + frame dragging)
            // Angular velocity of space due to frame dragging (Lense-Thirring)
            let omega_space = 2.0 * spin_a * r / (pow(r2 + spin_a*spin_a, 2.0)); 
            // Keplerian orbital velocity
            let omega_kepler = 1.0 / (pow(r, 1.5) + spin_a); 
            
            // Total angular velocity of gas
            let omega_gas = omega_kepler; // Simplified, gas rotates at Keplerian speed
            
            // 3-Velocity of gas vector (in Cartesian)
            // v = omega * r_cylindrical * tangent_vector
            let vel_gas = vec3f(-pos.z, 0.0, pos.x) * omega_gas;
            
            // 2. Relativistic Effects
            // Observer vector (photon direction is 'vel', so we look back along -vel)
            let view_dir = -normalize(vel);
            
            // Relativistic Doppler Factor D = 1 / (gamma * (1 - beta * cos_theta))
            // beta = v/c
            let beta_vec = vel_gas; // c=1
            let beta_sq = dot(beta_vec, beta_vec);
            
            // Clamp beta to avoid numerical explosion at r -> 0
            if (beta_sq < 0.99) {
                let gamma = 1.0 / sqrt(1.0 - beta_sq);
                let cos_theta = dot(normalize(beta_vec), view_dir);
                let beta = sqrt(beta_sq);
                let doppler = 1.0 / (gamma * (1.0 - beta * cos_theta));
                
                // Gravitational Redshift (approx)
                // Light climbing out loses energy. Frequency shift ~ sqrt(g_tt)
                // Schwarzschild approx: sqrt(1 - 2M/r)
                let grav_redshift = sqrt(max(0.01, 1.0 - 2.0 / r));
                
                // Total frequency shift
                let shift = doppler * grav_redshift;
                
                // 3. Procedural Texture / Density
                // Map position to rotating coordinates
                let angle = atan2(pos.z, pos.x);
                let rot_angle = angle - params.time * omega_gas * 10.0; // Rotate over time
                
                let uv_disk = vec2f(r * 2.0, rot_angle);
                let noise_base = fbm(uv_disk * 2.0);
                let noise_detail = fbm(uv_disk * 6.0 + vec2f(params.time, 0.0));
                
                // Density falls off vertically and radially
                let vertical_fade = smoothstep(disk_h, 0.0, dist_to_plane);
                let radial_fade = smoothstep(accretion_min, accretion_min + 1.0, r) * smoothstep(accretion_max, accretion_max - 2.0, r);
                
                let density = (noise_base * 0.7 + noise_detail * 0.3) * vertical_fade * radial_fade;
                
                // 4. Lighting Accumulation
                if (density > 0.05) {
                   // Temperature profile: Hotter inner, cooler outer
                   let temp_profile = pow(accretion_min / r, 1.5);
                   
                   // Apply relativistic beaming to intensity (Intensity ~ shift^4)
                   let intensity = density * temp_profile * pow(shift, 4.0) * params.disk_intensity;
                   
                   // Color shift: Blue shift increases effective temperature
                   let shifted_temp = temp_profile * shift; 
                   
                   let emission = blackbody(shifted_temp) * intensity * 2.0;
                   
                   // Optical Depth integration (Beer's Law approx for step)
                   // We use a fixed small step for density integration approximation or assume segment length
                   // Since step size varies, we must normalize. 
                   // Using step_dist from previous marching step is a decent approx for segment length
                   let segment_len = max(0.01, step_dist);
                   let alpha = 1.0 - exp(-density * segment_len * 2.0);
                   
                   color += emission * alpha * transmittance;
                   transmittance *= (1.0 - alpha);
                }
            }
        }

        if (transmittance < 0.01) {
            break; // Ray is opaque
        }

        // --- GRAVITY PHYSICS (GEODESIC STEP) ---
        // Adaptive Step Size
        // Smaller steps near the black hole for accuracy
        let h = clamp(0.05 * (r - horizon_r), 0.02, 0.5);
        step_dist = h;

        // Force Calculation (Pseudo-Newtonian + Gravitomagnetism for Spin)
        // 1. Schwarzschild-like acceleration (simulates bending)
        // F_g = -1.5 * rs/r^2 * (h_ang)^2 / r^3 ... simplified effective potential form
        // A robust numerical trick for light is: d^2x/dt^2 = -3GM/r^5 * (r . v)^2 * x ???
        // Let's use the standard "Acceleration of a photon" form:
        // a = -3/2 * (rs / r^5) * (x . v)^2 * x  <-- This is exact for Schwarzschild light bending in isotropic coords roughly
        
        let rv_dot = dot(pos, vel);
        let acc_schwarzschild = -1.5 * RS * (rv_dot * rv_dot) / (pow(r, 5.0)) * pos;
        
        // 2. Gravitomagnetism (Spin effect / Frame Dragging)
        // F_spin ~ v x (J x x) / r^5 approx
        // This bends light in the direction of rotation
        var acc_spin = vec3f(0.0);
        if (params.spin > 0.01) {
             let J = vec3f(0.0, 1.0, 0.0) * params.spin * M; // Spin angular momentum vector
             let rxJ = cross(pos, J);
             // Spin force resembles Lorentz force: F = v x B_g
             // B_g = curl A_g ~ (x * J) / r^5 ...
             // Simplified term for light:
             let curl_field = (3.0 * dot(pos, J) * pos - r2 * J) / pow(r, 5.0);
             acc_spin = 2.0 * cross(vel, curl_field); // Factor 2 for light? 
        }

        let acc_total = acc_schwarzschild + acc_spin;

        // Verlet Integration or Euler
        if (params.lensing_enabled > 0.5) {
             vel += acc_total * h;
             vel = normalize(vel); // Light speed is constant c=1 locally
        }
        
        pos += vel * h;
        
        if (r > 30.0) {
            break; // Escaped to infinity
        }
    }

    // 3. Background (Prodedural Galaxy & Stars)
    if (transmittance > 0.0) {
        let sky_dir = normalize(vel);
        
        // Use spherical coords map for noise
        let u = atan2(sky_dir.z, sky_dir.x);
        let v = sky_dir.y;
        // Scale UVs for noise frequency
        let uv_sky = vec2f(u, v);

        // --- STARS ---
        var star_layer1 = noise(uv_sky * 150.0); // Small dense stars
        star_layer1 = pow(max(0.0, star_layer1), 40.0) * 1.5;

        var star_layer2 = noise(uv_sky * 60.0 + 5.0); // Brighter sparse stars
        star_layer2 = pow(max(0.0, star_layer2), 50.0) * 2.0;

        let stars = star_layer1 + star_layer2;

        // --- NEBULA / MILKY WAY ---
        // Concentrate near galactic plane (v ~ 0)
        let warp = fbm(uv_sky * 3.0 + vec2f(0.0, params.time * 0.01));
        let galactic_plane_dist = abs(v + warp * 0.1);
        let galaxy_density = 1.0 / (1.0 + galactic_plane_dist * 8.0); // Falloff
        
        // Detailed structure
        let neb_noise = fbm(uv_sky * vec2f(5.0, 2.0) + warp);
        let neb_detail = fbm(uv_sky * vec2f(10.0, 5.0) - vec2f(params.time * 0.02));
        
        // Coloring
        let deep_purple = vec3f(0.1, 0.0, 0.2);
        let cosmic_blue = vec3f(0.1, 0.2, 0.5);
        let core_glow = vec3f(1.0, 0.8, 0.6);
        
        var galaxy_col = mix(deep_purple, cosmic_blue, neb_noise);
        galaxy_col = mix(galaxy_col, core_glow, galaxy_density * neb_detail * galaxy_density);
        
        // Add dust lanes (dark patches)
        let dust = fbm(uv_sky * 12.0 + 100.0);
        let dust_mask = smoothstep(0.4, 0.7, dust);
        galaxy_col *= (1.0 - dust_mask * 0.8 * galaxy_density);
        
        let galaxy_final = galaxy_col * galaxy_density * 2.0;
        
        let bg = vec3f(stars) + galaxy_final;
        
        color += bg * transmittance;
    }

    // 4. Tone Mapping & Gamma
    // Uncharted 2 Tone Map
    let exposed = color * 1.5;
    let A = 0.15;
    let B = 0.50;
    let C = 0.10;
    let D = 0.20;
    let E = 0.02;
    let F = 0.30;
    let W = 11.2;
    
    var tonemapped = ((exposed * (A * exposed + C * B) + D * E) / (exposed * (A * exposed + B) + D * F)) - E / F;
    let white = ((vec3f(W) * (A * W + C * B) + D * E) / (vec3f(W) * (A * W + B) + D * F)) - E / F;
    tonemapped = tonemapped / white;
    
    // Gamma Correction
    let final_col = pow(tonemapped, vec3f(1.0 / 2.2));

    return vec4f(final_col, 1.0);
}
`