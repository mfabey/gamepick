import { useEffect } from 'react';
import { GamerisenTabBar } from './TabBar';
import { useUnread, refreshUnread } from '../../services/unread';
import { useAuth } from '../../context/AuthContext';

export default function AppTabBar(props) {
  const unread = useUnread();
  const { account } = useAuth();
  useEffect(() => { refreshUnread(); }, [props.state.index]);
  const descriptors = { ...props.descriptors };
  const messages = props.state.routes.find((route) => route.name === 'messages');
  if (messages) descriptors[messages.key] = {
    ...descriptors[messages.key],
    options: { ...descriptors[messages.key].options, tabBarBadge: unread || undefined },
  };
  return <GamerisenTabBar {...props} descriptors={descriptors} tabs={{
    index: { icon: 'home' }, reviews: { icon: 'users' }, videos: { icon: 'play' },
    messages: { icon: 'msg' }, profile: { avatarUri: account?.avatar, name: account?.displayName || account?.username },
  }} />;
}
