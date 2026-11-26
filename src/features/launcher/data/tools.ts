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
    ref: '/bar',
    title: 'Bar',
    description: 'Order a drink',
    href: '/bar/',
    status: 'Active',
    public: true,
  },
  {
    ref: '/recipe',
    title: 'Recipes',
    description: 'View recipes',
    href: '/recipes/',
    status: 'Building',
    public: false,
  },
];
