<?php



namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Trajet;
use App\Models\Reservation;
use App\Models\Conducteur;
use App\Models\Avis;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('role:admin');
    }


    public function getDashboardStats()
    {
        try {
            Log::info('Fetching dashboard data - Start');

            // Statistiques de base simples et sûres
            $stats = [
                'total_users' => User::count(),
                'total_drivers' => Conducteur::count(),
                'total_rides' => Trajet::count(),
                'total_reservations' => Reservation::count(),
                'active_rides' => Trajet::where('statut', 'en_cours')->count(),
                'pending_drivers' => User::where('role','conducteur')->orwhere('status', 'en_attente')->count(),
//                'recent_complaints' => Message::where('type', 'reclamation')->count(),
                'total_revenue' => 0
            ];

            // Calcul simplifié du revenu total (sans multiplication complexe)
            $completedRides = Trajet::where('statut', 'terminé')
                ->whereNotNull('prix_par_place')
                ->get();

            $totalRevenue = 0;
            foreach ($completedRides as $ride) {
                $placesReservees = $ride->reservations()->count();
                $totalRevenue += $ride->prix_par_place * $placesReservees;
            }
            $stats['total_revenue'] = $totalRevenue;

            // Récupération simple des activités récentes
            $recent_activities = [];
            $recentRides = Trajet::latest()->take(5)->get();

            foreach ($recentRides as $ride) {
                $conducteurName = "Inconnu";
                $conducteur = Conducteur::find($ride->conducteur_id);

                if ($conducteur) {
                    $user = User::find($conducteur->user_id);
                    if ($user) {
                        $conducteurName = $user->nom . ' ' . $user->prenom;
                    }
                }

                $recent_activities[] = [
                    'id' => $ride->id,
                    'depart' => $ride->lieu_depart,
                    'arrivee' => $ride->lieu_arrivee,
                    'date_depart' => $ride->date_depart,
                    'statut' => $ride->statut,
                    'conducteur_name' => $conducteurName
                ];
            }

            Log::info('Dashboard data fetched successfully');
            return response()->json([
                'stats' => $stats,
                'recent_activities' => $recent_activities
            ]);

        } catch (\Exception $e) {
            Log::error('Dashboard error: ' . $e->getMessage());
            Log::error('Error trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement du tableau de bord'], 500);
        }
    }
    // User Management
    public function getUsers(Request $request)
    {
        try {
            Log::info('Fetching users with search: ' . $request->search);

            $users = User::with('conducteur')
                ->when($request->search, function ($query, $search) {
                    return $query->where('nom', 'like', "%{$search}%")
                        ->orWhere('prenom', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })
                ->paginate(10);

            return response()->json($users);
        } catch (\Exception $e) {
            Log::error('Get users error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement des utilisateurs'], 500);
        }
    }

    public function updateUserStatus(Request $request, $id)
    {
        try {
            Log::info('Updating user status for ID: ' . $id);

            $user = User::findOrFail($id);
            $user->status = $request->status;
            $user->save();

            return response()->json(['message' => 'Statut utilisateur mis à jour avec succès']);
        } catch (\Exception $e) {
            Log::error('Update user status error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors de la mise à jour du statut'], 500);
        }
    }

    // Driver Management
    public function getDrivers(Request $request)
    {
        try {
            Log::info('Fetching drivers with search: ' . $request->search);

            $drivers = Conducteur::with('user','vehicule')
                ->when($request->search, function ($query, $search) {
                    return $query->whereHas('user', function ($q) use ($search) {
                        $q->where('nom', 'like', "%{$search}%")
                            ->orWhere('prenom', 'like', "%{$search}%");
                    });
                })
                ->paginate(10);

            return response()->json($drivers);
        } catch (\Exception $e) {
            Log::error('Get drivers error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement des conducteurs'], 500);
        }
    }

    public function updateDriverStatus(Request $request, $id)
    {
        try {
            Log::info('Updating driver status for ID: ' . $id);

            $driver = Conducteur::findOrFail($id);
            $driver->statut = $request->statut;
            $driver->save();

            return response()->json(['message' => 'Statut conducteur mis à jour avec succès']);
        } catch (\Exception $e) {
            Log::error('Update driver status error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors de la mise à jour du statut'], 500);
        }
    }

    // Ride Management
    public function getRides(Request $request)
    {
        try {
            Log::info('Fetching rides with search: ' . $request->search);

            $rides = Trajet::with(['conducteur.user', 'reservations'])
                ->when($request->search, function ($query, $search) {
                    return $query->where('depart', 'like', "%{$search}%")
                        ->orWhere('arrivee', 'like', "%{$search}%");
                })
                ->when($request->status, function ($query, $status) {
                    return $query->where('statut', $status);
                })
                ->paginate(10);

            return response()->json($rides);
        } catch (\Exception $e) {
            Log::error('Get rides error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement des trajets'], 500);
        }
    }

    public function updateRideStatus(Request $request, $id)
    {
        try {
            Log::info('Updating ride status for ID: ' . $id);

            $ride = Trajet::findOrFail($id);
            $ride->statut = $request->statut;
            $ride->save();

            return response()->json(['message' => 'Statut trajet mis à jour avec succès']);
        } catch (\Exception $e) {
            Log::error('Update ride status error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors de la mise à jour du statut'], 500);
        }
    }

    // Reservation Management
    public function getReservations(Request $request)
    {
        try {
            Log::info('Fetching reservations with search: ' . $request->search);

            $reservations = Reservation::with(['user', 'trajet'])
                ->when($request->search, function ($query, $search) {
                    return $query->whereHas('user', function ($q) use ($search) {
                        $q->where('nom', 'like', "%{$search}%")
                            ->orWhere('prenom', 'like', "%{$search}%");
                    });
                })
                ->paginate(10);

            return response()->json($reservations);
        } catch (\Exception $e) {
            Log::error('Get reservations error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement des réservations'], 500);
        }
    }

    // Complaints Management
    public function getComplaints(Request $request)
    {
        try {
            Log::info('Fetching complaints with search: ' . $request->search);

            $complaints = Message::where('type', 'reclamation')
                ->with(['sender', 'receiver'])
                ->when($request->search, function ($query, $search) {
                    return $query->where('contenu', 'like', "%{$search}%");
                })
                ->paginate(10);

            return response()->json($complaints);
        } catch (\Exception $e) {
            Log::error('Get complaints error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement des réclamations'], 500);
        }
    }

    public function updateComplaintStatus(Request $request, $id)
    {
        try {
            Log::info('Updating complaint status for ID: ' . $id);

            $complaint = Message::findOrFail($id);
            $complaint->statut = $request->statut;
            $complaint->save();

            return response()->json(['message' => 'Statut réclamation mis à jour avec succès']);
        } catch (\Exception $e) {
            Log::error('Update complaint status error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors de la mise à jour du statut'], 500);
        }
    }

    // Analytics
    public function getAnalytics()
    {
        try {
            Log::info('Fetching analytics data');

            $now = Carbon::now();
            $thirtyDaysAgo = $now->copy()->subDays(30);

            $dailyStats = DB::table('reservations')
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
                ->whereBetween('created_at', [$thirtyDaysAgo, $now])
                ->groupBy('date')
                ->get();

            $userGrowth = DB::table('users')
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
                ->whereBetween('created_at', [$thirtyDaysAgo, $now])
                ->groupBy('date')
                ->get();

            $revenue = collect();
            if (Schema::hasColumn('reservations', 'prix_total')) {
                $revenue = DB::table('reservations')
                    ->select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(prix_total) as total'))
                    ->whereBetween('created_at', [$thirtyDaysAgo, $now])
                    ->groupBy('date')
                    ->get();
            }

            // Statistiques des rôles
            $roleStats = [
                'passagers' => DB::table('users')->where('role', 'passager')->count(),
                'conducteurs' => DB::table('users')->where('role', 'conducteur')->count()
            ];

            // Statistiques des marques de véhicules
            $vehicleStats = DB::table('vehicules')
                ->select('marque', DB::raw('COUNT(*) as count'))
                ->groupBy('marque')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->marque => $item->count];
                });

            Log::info('Analytics data fetched successfully');
            return response()->json([
                'daily_reservations' => $dailyStats,
                'user_growth' => $userGrowth,
                'revenue' => $revenue,
                'role_stats' => $roleStats,
                'vehicle_stats' => $vehicleStats
            ]);
        } catch (\Exception $e) {
            Log::error('Analytics error: ' . $e->getMessage());
            Log::error('Error trace: ' . $e->getTraceAsString());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement des analyses'], 500);
        }
    }

    // Recent Activities
    public function getRecentActivities()
    {
        try {
            Log::info('Fetching recent activities');

            $activities = collect();

            // Get recent reservations with their status changes
            $reservations = Reservation::with(['passager', 'trajet'])
                ->latest()
                ->take(20)
                ->get()
                ->map(function ($reservation) {
                    $statusText = match($reservation->status) {
                        'en_attente' => 'a fait une réservation',
                        'confirmee' => 'a confirmé sa réservation',
                        'annulee' => 'a annulé sa réservation',
                        default => 'a modifié sa réservation'
                    };

                    return [
                        'type' => 'reservation',
                        'date' => $reservation->created_at,
                        'nom' => $reservation->passager->nom,
                        'prenom' => $reservation->passager->prenom,
                        'role' => 'passager',
                        'statut' => $reservation->status,
                        'details' => "{$reservation->passager->nom} {$reservation->passager->prenom} {$statusText} pour le trajet de {$reservation->trajet->lieu_depart} à {$reservation->trajet->lieu_arrivee}",
                        'activity_date' => $reservation->created_at
                    ];
                });

            // Get recent rides with their status changes
            $rides = Trajet::with(['conducteur.user'])
                ->latest()
                ->take(20)
                ->get()
                ->map(function ($ride) {
                    $statusText = match($ride->statut) {
                        'en_attente' => 'a créé un nouveau trajet',
                        'en_cours' => 'a commencé son trajet',
                        'termine' => 'a terminé son trajet',
                        'annule' => 'a annulé son trajet',
                        default => 'a modifié son trajet'
                    };

                    return [
                        'type' => 'trajet',
                        'date' => $ride->created_at,
                        'nom' => $ride->conducteur->user->nom,
                        'prenom' => $ride->conducteur->user->prenom,
                        'role' => 'conducteur',
                        'statut' => $ride->statut,
                        'details' => "{$ride->conducteur->user->nom} {$ride->conducteur->user->prenom} {$statusText} de {$ride->lieu_depart} à {$ride->lieu_arrivee}",
                        'activity_date' => $ride->created_at
                    ];
                });

            // Get recent users
            $users = User::latest()
                ->take(10)
                ->get()
                ->map(function ($user) {
                    return [
                        'type' => 'user',
                        'date' => $user->created_at,
                        'nom' => $user->nom,
                        'prenom' => $user->prenom,
                        'role' => $user->role,
                        'statut' => $user->status,
                        'details' => "{$user->nom} {$user->prenom} a créé un compte",
                        'activity_date' => $user->created_at
                    ];
                });

            // Merge and sort by date
            $activities = $activities->concat($reservations)
                ->concat($rides)
                ->concat($users)
                ->sortByDesc('date')
                ->values()
                ->take(20);

            Log::info('Recent activities fetched successfully');
            return response()->json($activities);
        } catch (\Exception $e) {
            Log::error('Recent activities error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement des activités récentes'], 500);
        }
    }

    // Revenue Stats
    public function getRevenueStats()
    {
        try {
            Log::info('Fetching revenue stats');

            $now = Carbon::now();
            $startOfMonth = $now->copy()->startOfMonth();

            $monthlyRevenue = 0;
            $monthlyCount = 0;
            $dailyRevenue = collect();

            if (Schema::hasColumn('reservations', 'montant')) {
                $monthlyStats = DB::table('reservations')
                    ->select(
                        DB::raw('SUM(montant) as total'),
                        DB::raw('COUNT(*) as count')
                    )
                    ->whereBetween('created_at', [$startOfMonth, $now])
                    ->first();

                $monthlyRevenue = $monthlyStats->total ?? 0;
                $monthlyCount = $monthlyStats->count ?? 0;

                $dailyRevenue = DB::table('reservations')
                    ->select(
                        DB::raw('DATE(created_at) as date'),
                        DB::raw('SUM(montant) as total'),
                        DB::raw('COUNT(*) as count')
                    )
                    ->whereBetween('created_at', [$startOfMonth, $now])
                    ->groupBy('date')
                    ->get();
            }

            Log::info('Revenue stats fetched successfully');
            return response()->json([
                'monthly_total' => $monthlyRevenue,
                'monthly_count' => $monthlyCount,
                'daily_stats' => $dailyRevenue
            ]);
        } catch (\Exception $e) {
            Log::error('Revenue stats error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement des statistiques de revenus'], 500);
        }
    }

    // Payment Management
    public function getPayments(Request $request)
    {
        try {
            Log::info('Fetching payments with search: ' . $request->search);

            $payments = Trajet::where('statut', 'termine')
                ->with(['conducteur.user', 'reservations'])
                ->when($request->search, function ($query, $search) {
                    return $query->whereHas('conducteur.user', function ($q) use ($search) {
                        $q->where('nom', 'like', "%{$search}%")
                            ->orWhere('prenom', 'like', "%{$search}%");
                    });
                })
                ->paginate(10);

            return response()->json($payments);
        } catch (\Exception $e) {
            Log::error('Get payments error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement des paiements'], 500);
        }
    }

    public function getPaymentStats()
    {
        try {
            Log::info('Fetching payment stats');

            $stats = [
                'total_revenue' => Trajet::where('statut', 'termine')
                        ->whereNotNull('prix_par_place')
                        ->whereNotNull('nombre_places')
                        ->sum(DB::raw('prix_par_place * nombre_places')) ?? 0,
                'monthly_revenue' => Trajet::where('statut', 'termine')
                        ->whereNotNull('prix_par_place')
                        ->whereNotNull('nombre_places')
                        ->whereMonth('created_at', Carbon::now()->month)
                        ->sum(DB::raw('prix_par_place * nombre_places')) ?? 0,
                'average_ride_price' => Trajet::where('statut', 'termine')
                        ->whereNotNull('prix_par_place')
                        ->avg('prix_par_place') ?? 0,
                'total_completed_rides' => Trajet::where('statut', 'termine')->count()
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Get payment stats error: ' . $e->getMessage());
            return response()->json(['message' => 'Une erreur est survenue lors du chargement des statistiques de paiement'], 500);
        }
    }
}
