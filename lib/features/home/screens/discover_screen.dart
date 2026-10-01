import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';


class DiscoverScreen extends ConsumerWidget {
  const DiscoverScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Discover'),
        actions: [
          IconButton(
            icon: const Icon(Icons.videocam_outlined),
            onPressed: () {},
            tooltip: 'Video feed',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
          // Creator feed teaser
          Container(
            height: 200,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  theme.colorScheme.primary,
                  theme.colorScheme.primary.withValues(alpha: 0.7),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Stack(
              children: [
                Center(
                  child: Icon(
                    Icons.play_circle_fill,
                    size: 64,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
                Positioned(
                  bottom: 16,
                  left: 16,
                  right: 16,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Watch creators showcase',
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Discover products through video',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Community activity
          Text(
            'Community activity',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          
          // Sample activity items
          ...List.generate(5, (index) => _ActivityTile(index: index)),
          ],
        ),
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final int index;
  
  const _ActivityTile({required this.index});
  
  static const activities = [
    ('Marie K.', 'bought a wireless headset', '★ 5/5', Icons.headphones),
    ('Jean P.', 'bought a dress', null, Icons.checkroom),
    ('Alice M.', 'rated a blender 4/5', '★ 4/5', Icons.blender),
    ('Bob T.', 'bought sneakers', null, Icons.ice_skating),
    ('Grace L.', 'bought a phone case', null, Icons.phone_android),
  ];
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final activity = activities[index % activities.length];
    
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.1),
              child: Text(
                activity.$1.substring(0, 1),
                style: TextStyle(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: RichText(
                text: TextSpan(
                  style: theme.textTheme.bodySmall,
                  children: [
                    TextSpan(
                      text: activity.$1,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    TextSpan(text: ' ${activity.$2}'),
                    if (activity.$3 != null)
                      TextSpan(
                        text: ' ${activity.$3}',
                        style: TextStyle(color: Colors.amber.shade800),
                      ),
                  ],
                ),
              ),
            ),
            Icon(activity.$4, size: 18, color: theme.colorScheme.outline),
          ],
        ),
      ),
    );
  }
}