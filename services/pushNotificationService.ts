import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Serviço de Notificações Push para FitnessMatch
export const PushNotificationService = {
  // Token FCM do dispositivo
  fcmToken: null as string | null,

  // Inicializar notificações
  async init(): Promise<boolean> {
    // Só funciona em dispositivos nativos (não no web)
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Push notifications only work on native platforms');
      return false;
    }

    try {
      // Solicitar permissão
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        // Registrar para receber push
        await PushNotifications.register();
        
        // Configurar listeners
        this.setupListeners();
        
        console.log('✅ Push notifications initialized');
        return true;
      } else {
        console.log('❌ Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  },

  // Configurar listeners de eventos
  setupListeners() {
    // Quando receber o token de registro
    PushNotifications.addListener('registration', (token) => {
      console.log('📲 Push registration success, token:', token.value);
      this.fcmToken = token.value;
      
      // Aqui você pode enviar o token para seu backend (Supabase)
      this.saveTokenToServer(token.value);
    });

    // Erro no registro
    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Push registration error:', error.error);
    });

    // Notificação recebida em foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📬 Push received in foreground:', notification);
      
      // Mostrar como notificação local quando app está aberto
      this.showLocalNotification(
        notification.title || 'FitnessMatch',
        notification.body || ''
      );
    });

    // Usuário tocou na notificação
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('👆 Push notification tapped:', notification);
      
      // Aqui você pode navegar para uma tela específica
      const data = notification.notification.data;
      if (data?.type === 'booking') {
        // Navegar para reservas
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'reservas' } }));
      } else if (data?.type === 'message') {
        // Navegar para mensagens
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'mensagens' } }));
      }
    });
  },

  // Salvar token no servidor (Supabase)
  async saveTokenToServer(token: string) {
    try {
      // Importar supabase client
      const { supabase, isSupabaseConfigured } = await import('./supabaseClient');
      
      if (!isSupabaseConfigured()) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Salvar token na tabela profiles
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);
        
      console.log('✅ Push token saved to server');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  },

  // Mostrar notificação local (quando app está em foreground)
  async showLocalNotification(title: string, body: string, data?: any) {
    try {
      // Solicitar permissão para notificações locais
      const permStatus = await LocalNotifications.requestPermissions();
      
      if (permStatus.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title: title,
              body: body,
              schedule: { at: new Date(Date.now() + 100) }, // Mostrar imediatamente
              sound: 'default',
              extra: data
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  },

  // Enviar notificação de reserva aprovada
  async notifyBookingApproved(userName: string, professionalName: string, date: string) {
    await this.showLocalNotification(
      '✅ Reserva Confirmada!',
      `${professionalName} confirmó tu cita para ${date}`
    );
  },

  // Enviar notificação de reserva cancelada
  async notifyBookingCancelled(userName: string, professionalName: string, reason?: string) {
    await this.showLocalNotification(
      '❌ Reserva Cancelada',
      `${professionalName} canceló la cita${reason ? `: ${reason}` : ''}`
    );
  },

  // Enviar notificação de nova mensagem
  async notifyNewMessage(senderName: string, preview: string) {
    await this.showLocalNotification(
      `💬 Mensaje de ${senderName}`,
      preview.length > 50 ? preview.substring(0, 50) + '...' : preview
    );
  },

  // Enviar notificação de nova reserva (para profesional)
  async notifyNewBooking(clientName: string, date: string) {
    await this.showLocalNotification(
      '📅 Nueva Reserva!',
      `${clientName} quiere agendar para ${date}`
    );
  }
};

// Exportar funções auxiliares para uso direto
export const initPushNotifications = () => PushNotificationService.init();
export const notifyBookingApproved = PushNotificationService.notifyBookingApproved.bind(PushNotificationService);
export const notifyBookingCancelled = PushNotificationService.notifyBookingCancelled.bind(PushNotificationService);
export const notifyNewMessage = PushNotificationService.notifyNewMessage.bind(PushNotificationService);
export const notifyNewBooking = PushNotificationService.notifyNewBooking.bind(PushNotificationService);
