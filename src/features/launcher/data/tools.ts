export interface Tool {
  ref: string;
  title: string;
  description: string;
  href: string;
  status: 'Active' | 'Building' | 'Idea';
  /** Whether this card should show for logged-out visitors. */
  public: boolean;
}

export const tools: Tool[] = [
  {
    ref: 'A1',
    title: 'Bar',
    description: 'Order a drink. Recipes and orders live behind /bar/recipes and /bar/orders.',
    href: '/bar/',
    status: 'Building',
    public: true,
  },
  {
    ref: 'A2',
    title: 'Library',
    description: 'Download a book',
    href: '/bar/',
    status: 'Building',
    public: false,
  },
];
